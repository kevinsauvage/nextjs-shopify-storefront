import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sdk, cookieGet, cookieSet, cookieDelete } = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  sdk: {
    cartCreate: vi.fn(),
    cartDiscountCodesUpdate: vi.fn(),
    cartLinesAdd: vi.fn(),
    cartLinesRemove: vi.fn(),
    cartLinesUpdate: vi.fn(),
    getCart: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ delete: cookieDelete, get: cookieGet, set: cookieSet }),
}));

vi.mock('@/shopify', () => ({ storefrontSdk: () => sdk }));

vi.mock('@/shopify/helpers', () => ({
  adjustPaginationVariables: (variables: Record<string, unknown>) => variables,
}));

vi.mock('@/utils/api-responses', () => ({
  mapShopifyUserErrors: (userErrors?: unknown[]) => (userErrors?.length ? userErrors : undefined),
  safeLogError: vi.fn(),
}));

import config from '@/config';

import { CartService } from './cart.service';

const CART_ID_COOKIE = config.cookies.cartId;

const CART_ID = 'cart-1';
const NEW_CART = 'new-cart';
const FRESH_CART = 'fresh-cart';
const EXISTING_CART = 'existing-cart';
const STALE_CART = 'stale-cart';
const VARIANT_ID = 'v1';
const NETWORK_ERROR = 'network down';

describe('CartService', () => {
  beforeEach(() => {
    cookieGet.mockReset();
    cookieSet.mockReset();
    cookieDelete.mockReset();
    Object.values(sdk).forEach((mock) => mock.mockReset());
  });

  describe('getCart', () => {
    it('returns the cart', async () => {
      sdk.getCart.mockResolvedValue({ cart: { id: CART_ID } });

      await expect(CartService.getCart(CART_ID)).resolves.toEqual({ id: CART_ID });
    });

    it('returns null only when Shopify confirms the cart is gone', async () => {
      sdk.getCart.mockResolvedValue({ cart: null });

      await expect(CartService.getCart(CART_ID)).resolves.toBeNull();
    });

    it('throws on transient failures instead of pretending the cart is missing', async () => {
      sdk.getCart.mockRejectedValue(new Error(NETWORK_ERROR));

      await expect(CartService.getCart(CART_ID)).rejects.toThrow(NETWORK_ERROR);
    });
  });

  describe('addLines', () => {
    it('creates a cart when none is stored, then adds the line', async () => {
      cookieGet.mockReturnValue(undefined);
      sdk.cartCreate.mockResolvedValue({
        cartCreate: { cart: { id: NEW_CART }, userErrors: [], warnings: [] },
      });
      sdk.cartLinesAdd.mockResolvedValue({
        cartLinesAdd: { cart: { id: NEW_CART, totalQuantity: 1 }, userErrors: [] },
      });

      const cart = await CartService.addLines([{ merchandiseId: VARIANT_ID, quantity: 1 }]);

      expect(sdk.cartCreate).toHaveBeenCalledTimes(1);
      expect(cookieSet).toHaveBeenCalledWith(CART_ID_COOKIE, NEW_CART, expect.anything());
      expect(sdk.cartLinesAdd).toHaveBeenCalledWith(expect.objectContaining({ cartId: NEW_CART }));
      expect(cart).toEqual({ id: NEW_CART, totalQuantity: 1 });
    });

    it('recreates the cart when the stored cart no longer exists', async () => {
      cookieGet.mockReturnValueOnce({ value: STALE_CART }).mockReturnValue(undefined);
      sdk.cartLinesAdd
        .mockResolvedValueOnce({
          cartLinesAdd: { cart: null, userErrors: [{ message: 'Cart not found' }] },
        })
        .mockResolvedValueOnce({
          cartLinesAdd: { cart: { id: FRESH_CART }, userErrors: [] },
        });
      sdk.getCart.mockResolvedValue({ cart: null });
      sdk.cartCreate.mockResolvedValue({
        cartCreate: { cart: { id: FRESH_CART }, userErrors: [] },
      });

      const cart = await CartService.addLines([{ merchandiseId: VARIANT_ID, quantity: 1 }]);

      expect(cookieDelete).toHaveBeenCalledWith(expect.objectContaining({ name: CART_ID_COOKIE }));
      expect(sdk.cartCreate).toHaveBeenCalledTimes(1);
      expect(cart).toEqual({ id: FRESH_CART });
    });

    it('keeps the existing cart when the mutation fails validation', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartLinesAdd.mockResolvedValue({
        cartLinesAdd: { cart: null, userErrors: [{ message: 'Invalid merchandise' }] },
      });
      sdk.getCart.mockResolvedValue({ cart: { id: EXISTING_CART } });

      await expect(CartService.addLines([{ merchandiseId: 'bad', quantity: 1 }])).rejects.toThrow(
        'Invalid merchandise',
      );

      expect(cookieDelete).not.toHaveBeenCalled();
      expect(sdk.cartCreate).not.toHaveBeenCalled();
    });

    it('does not replace the cart on a transient mutation error', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartLinesAdd.mockRejectedValue(new Error(NETWORK_ERROR));

      await expect(
        CartService.addLines([{ merchandiseId: VARIANT_ID, quantity: 1 }]),
      ).rejects.toThrow(NETWORK_ERROR);

      expect(cookieDelete).not.toHaveBeenCalled();
      expect(sdk.cartCreate).not.toHaveBeenCalled();
    });
  });
});
