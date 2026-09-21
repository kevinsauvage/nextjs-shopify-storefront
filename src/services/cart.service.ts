import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import config from '@/config';
import { storefrontSdk } from '@/shopify';
import { adjustPaginationVariables } from '@/shopify/helpers';
import type { CartFieldsFragment, CartLineInput, CartLineUpdateInput } from '@/shopify/storefront';
import { mapShopifyUserErrors, safeLogError } from '@/utils/api-responses';
import { getSecureCookieOptions } from '@/utils/cookie-security';

/**
 * Cart service
 * Handles all cart-related business logic
 */
export class CartService {
  /**
   * Get cart by ID from Shopify
   */
  static async getCart(cartId: string): Promise<CartFieldsFragment | null> {
    try {
      const response = await storefrontSdk('no-store').getCart({
        cartId,
        ...adjustPaginationVariables({ first: 100 }),
      });

      return response?.cart || null;
    } catch (error) {
      safeLogError('CartService.getCart', error);
      return null;
    }
  }

  /**
   * Create a new cart in Shopify
   */
  static async createCart(): Promise<CartFieldsFragment> {
    const createCartResponse = await storefrontSdk('no-store').cartCreate({
      ...adjustPaginationVariables({ first: 100 }),
    });

    const { cart, userErrors, warnings } = createCartResponse.cartCreate || {};

    if (warnings && Array.isArray(warnings) && warnings?.length) {
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

    // Store cart ID in cookie
    const cookieStore = await cookies();
    cookieStore.set(config.cookies.cartId, cart.id, getSecureCookieOptions());

    // Revalidate cart page
    this.revalidate();

    return cart;
  }

  /**
   * Get or create cart
   * Returns existing cart if available, otherwise creates a new one
   */
  static async getOrCreateCart(): Promise<CartFieldsFragment> {
    const cartId = await this.getCartId();

    if (cartId) {
      const cart = await this.getCart(cartId);
      if (cart) {
        return cart;
      }
    }

    return this.createCart();
  }

  /**
   * Get cart by ID (alias for getCart)
   */
  static async getCartById(cartId: string): Promise<CartFieldsFragment | null> {
    return this.getCart(cartId);
  }

  /**
   * Get current cart ID from cookies
   */
  static async getCartId(): Promise<string | null> {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(config.cookies.cartId)?.value;
    return cartId || null;
  }

  /**
   * Require an existing cart ID or fail explicitly.
   */
  private static async requireCartId(): Promise<string> {
    const cartId = await this.getCartId();
    if (!cartId) {
      throw new Error('Cart not found');
    }
    return cartId;
  }

  /**
   * Validate a Shopify cart mutation payload and return the cart.
   */
  private static handleCartMutation(
    payload:
      | {
          cart?: CartFieldsFragment | null;
          userErrors?: Array<{ message?: string }> | null;
        }
      | null
      | undefined,
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
   * Add lines to the cart
   */
  static async addLines(lines: CartLineInput[]): Promise<CartFieldsFragment> {
    const cartId = await this.requireCartId();

    const response = await storefrontSdk('no-store').cartLinesAdd({
      cartId,
      lines,
      ...adjustPaginationVariables({ first: 100 }),
    });

    return this.handleCartMutation(response?.cartLinesAdd, 'Failed to add product');
  }

  /**
   * Update cart line quantities
   */
  static async updateLines(lines: CartLineUpdateInput[]): Promise<CartFieldsFragment> {
    const cartId = await this.requireCartId();

    const response = await storefrontSdk('no-store').cartLinesUpdate({
      cartId,
      lines,
      ...adjustPaginationVariables({ first: 100 }),
    });

    return this.handleCartMutation(response?.cartLinesUpdate, 'Failed to update cart');
  }

  /**
   * Remove a line from the cart
   */
  static async removeLine(lineId: string): Promise<CartFieldsFragment> {
    const cartId = await this.requireCartId();

    const response = await storefrontSdk('no-store').cartLinesRemove({
      cartId,
      lineIds: [lineId],
      ...adjustPaginationVariables({ first: 100 }),
    });

    return this.handleCartMutation(response?.cartLinesRemove, 'Failed to remove product');
  }

  /**
   * Update the cart discount codes
   */
  static async updateDiscountCodes(discountCodes: string[]): Promise<CartFieldsFragment> {
    const cartId = await this.requireCartId();

    const response = await storefrontSdk('no-store').cartDiscountCodesUpdate({
      cartId,
      discountCodes,
      ...adjustPaginationVariables({ first: 100 }),
    });

    const { cart, userErrors } = response?.cartDiscountCodesUpdate || {};

    if (userErrors?.length) {
      throw new Error(userErrors[0]?.message || 'Failed to update discount codes');
    }

    if (!cart) {
      throw new Error('Failed to update discount codes');
    }

    this.revalidate();
    return cart;
  }

  /**
   * Revalidate cart cache
   */
  static revalidate(): void {
    revalidatePath(config.routes.cart);
  }
}

