import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import config from '@/config';
import { storefrontSdk } from '@/shopify';
import { adjustPaginationVariables } from '@/shopify/helpers';
import type { CartFieldsFragment, CartLineInput, CartLineUpdateInput } from '@/shopify/storefront';
import { mapShopifyUserErrors, safeLogError } from '@/utils/api-responses';
import { getSecureCookieOptions } from '@/utils/cookie-security';

type CartMutationPayload =
  | {
      cart?: CartFieldsFragment | null;
      userErrors?: Array<{ message?: string }> | null;
    }
  | null
  | undefined;

/**
 * Cart service
 * Handles all cart-related business logic.
 *
 * The cart id is stored in an httpOnly cookie, and cookies can only be written
 * from a Server Action / Route Handler — never while rendering. Cart mutations
 * therefore create the cart on demand, which removes the first-visit race the
 * client used to work around with an eager `createCartAction` effect.
 */
export class CartService {
  /**
   * Read a cart from Shopify.
   *
   * Returns `null` only when Shopify confirms the cart no longer exists.
   * Transient/network failures throw, so callers never mistake an outage for a
   * missing cart and replace a customer's cart by accident.
   */
  static async getCart(cartId: string): Promise<CartFieldsFragment | null> {
    const response = await storefrontSdk('no-store').getCart({
      cartId,
      ...adjustPaginationVariables({ first: 100 }),
    });

    return response?.cart || null;
  }

  /**
   * Create a new cart in Shopify and persist its id in the cart cookie.
   */
  static async createCart(): Promise<CartFieldsFragment> {
    const createCartResponse = await storefrontSdk('no-store').cartCreate({
      ...adjustPaginationVariables({ first: 100 }),
    });

    const { cart, userErrors, warnings } = createCartResponse.cartCreate || {};

    if (warnings && Array.isArray(warnings) && warnings.length) {
      safeLogError('CartService.createCart - warnings', warnings);
    }

    const mappedUserErrors = mapShopifyUserErrors(userErrors);
    if (mappedUserErrors) {
      safeLogError('CartService.createCart - user errors', mappedUserErrors);
      if (!cart?.id) {
        throw new Error(
          mappedUserErrors[0]?.message || 'Failed to create cart due to validation errors',
        );
      }
    }

    if (!cart?.id) {
      throw new Error('Failed to create cart');
    }

    const cookieStore = await cookies();
    cookieStore.set(config.cookies.cartId, cart.id, getSecureCookieOptions());

    this.revalidate();

    return cart;
  }

  /**
   * Get the current cart id from cookies.
   */
  static async getCartId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(config.cookies.cartId)?.value || null;
  }

  /**
   * Return the current cart id, creating a cart first when none is stored.
   * Must run inside a Server Action / Route Handler (it writes the cookie).
   */
  private static async requireCartId(): Promise<string> {
    const cartId = await this.getCartId();
    if (cartId) return cartId;

    const cart = await this.createCart();
    return cart.id;
  }

  private static async clearCartId(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(config.cookies.cartId);
  }

  /**
   * Whether Shopify confirms the stored cart no longer exists. On any ambiguous
   * failure we report `false` so the cart is never replaced by accident.
   */
  private static async cartIsGone(cartId: string): Promise<boolean> {
    try {
      return (await this.getCart(cartId)) === null;
    } catch (error) {
      safeLogError('CartService.cartIsGone', error);
      return false;
    }
  }

  /**
   * Validate a Shopify cart mutation payload and return the cart.
   */
  private static handleCartMutation(
    payload: CartMutationPayload,
    fallbackMessage: string,
  ): CartFieldsFragment {
    const { cart, userErrors } = payload || {};

    if (userErrors?.length) {
      throw new Error(userErrors[0]?.message || fallbackMessage);
    }

    if (!cart) {
      throw new Error(fallbackMessage);
    }

    this.revalidate();
    return cart;
  }

  /**
   * Run a cart mutation, recovering exactly once when the stored cart no longer
   * exists. A transient failure throws and leaves the cart cookie untouched.
   */
  private static async mutate(
    fallbackMessage: string,
    run: (cartId: string) => Promise<CartMutationPayload>,
  ): Promise<CartFieldsFragment> {
    const cartId = await this.requireCartId();
    const payload = await run(cartId);

    if (payload?.cart) {
      return this.handleCartMutation(payload, fallbackMessage);
    }

    // No cart came back: recreate only when Shopify confirms the cart is gone,
    // otherwise surface the original mutation error without replacing it.
    if (await this.cartIsGone(cartId)) {
      await this.clearCartId();
      const freshCartId = await this.requireCartId();
      return this.handleCartMutation(await run(freshCartId), fallbackMessage);
    }

    return this.handleCartMutation(payload, fallbackMessage);
  }

  /**
   * Add lines to the cart
   */
  static async addLines(lines: CartLineInput[]): Promise<CartFieldsFragment> {
    return this.mutate('Failed to add product', (cartId) =>
      storefrontSdk('no-store')
        .cartLinesAdd({ cartId, lines, ...adjustPaginationVariables({ first: 100 }) })
        .then((response) => response?.cartLinesAdd),
    );
  }

  /**
   * Update cart line quantities
   */
  static async updateLines(lines: CartLineUpdateInput[]): Promise<CartFieldsFragment> {
    return this.mutate('Failed to update cart', (cartId) =>
      storefrontSdk('no-store')
        .cartLinesUpdate({ cartId, lines, ...adjustPaginationVariables({ first: 100 }) })
        .then((response) => response?.cartLinesUpdate),
    );
  }

  /**
   * Remove a line from the cart
   */
  static async removeLine(lineId: string): Promise<CartFieldsFragment> {
    return this.mutate('Failed to remove product', (cartId) =>
      storefrontSdk('no-store')
        .cartLinesRemove({
          cartId,
          lineIds: [lineId],
          ...adjustPaginationVariables({ first: 100 }),
        })
        .then((response) => response?.cartLinesRemove),
    );
  }

  /**
   * Update the cart discount codes
   */
  static async updateDiscountCodes(discountCodes: string[]): Promise<CartFieldsFragment> {
    return this.mutate('Failed to update discount codes', (cartId) =>
      storefrontSdk('no-store')
        .cartDiscountCodesUpdate({
          cartId,
          discountCodes,
          ...adjustPaginationVariables({ first: 100 }),
        })
        .then((response) => response?.cartDiscountCodesUpdate),
    );
  }

  /**
   * Revalidate cart cache
   */
  static revalidate(): void {
    revalidatePath(config.routes.cart);
  }
}
