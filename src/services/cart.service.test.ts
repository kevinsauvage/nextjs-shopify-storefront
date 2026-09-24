import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sdk, cookieGet, cookieSet, cookieDelete } = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  sdk: {
    cartAttributesUpdate: vi.fn(),
    cartCreate: vi.fn(),
    cartDiscountCodesUpdate: vi.fn(),
    cartGiftCardCodesRemove: vi.fn(),
    cartGiftCardCodesUpdate: vi.fn(),
    cartLinesAdd: vi.fn(),
    cartLinesRemove: vi.fn(),
    cartLinesUpdate: vi.fn(),
    cartNoteUpdate: vi.fn(),
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

vi.mock('@/lib/logger', () => ({
  reportError: vi.fn(),
}));

import config from '@/config';
import { reportError } from '@/lib/logger';

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
    vi.mocked(reportError).mockClear();
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

    it('surfaces the fallback message when the payload is undefined', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartLinesAdd.mockResolvedValue(undefined);
      sdk.getCart.mockResolvedValue({ cart: { id: EXISTING_CART } });

      await expect(
        CartService.addLines([{ merchandiseId: VARIANT_ID, quantity: 1 }]),
      ).rejects.toThrow('Failed to add product');
    });

    it('never replaces the cart when cartIsGone itself fails', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartLinesAdd.mockResolvedValue({
        cartLinesAdd: { cart: null, userErrors: [] },
      });
      sdk.getCart.mockRejectedValue(new Error(NETWORK_ERROR));

      await expect(
        CartService.addLines([{ merchandiseId: VARIANT_ID, quantity: 1 }]),
      ).rejects.toThrow('Failed to add product');

      expect(reportError).toHaveBeenCalledWith('CartService.cartIsGone', expect.any(Error));
      expect(cookieDelete).not.toHaveBeenCalled();
      expect(sdk.cartCreate).not.toHaveBeenCalled();
    });

    it('falls back to the generic message when user errors carry none', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartLinesAdd.mockResolvedValue({
        cartLinesAdd: { cart: null, userErrors: [{}] },
      });
      sdk.getCart.mockResolvedValue({ cart: { id: EXISTING_CART } });

      await expect(
        CartService.addLines([{ merchandiseId: VARIANT_ID, quantity: 1 }]),
      ).rejects.toThrow('Failed to add product');
    });
  });

  describe('createCart', () => {
    it('reports warnings but still returns the cart', async () => {
      sdk.cartCreate.mockResolvedValue({
        cartCreate: { cart: { id: NEW_CART }, userErrors: [], warnings: [{ message: 'slow' }] },
      });

      const cart = await CartService.createCart();

      expect(cart).toEqual({ id: NEW_CART });
      expect(reportError).toHaveBeenCalledWith('CartService.createCart - warnings', [
        { message: 'slow' },
      ]);
    });

    it('ignores non-array warnings without reporting', async () => {
      sdk.cartCreate.mockResolvedValue({
        cartCreate: {
          cart: { id: NEW_CART },
          userErrors: [],
          warnings: 'oops' as unknown as [],
        },
      });

      const cart = await CartService.createCart();

      expect(cart).toEqual({ id: NEW_CART });
      expect(reportError).not.toHaveBeenCalled();
    });

    it('throws when cartCreate is missing entirely', async () => {
      sdk.cartCreate.mockResolvedValue({});

      await expect(CartService.createCart()).rejects.toThrow('Failed to create cart');
    });

    it('throws when the cart has no id and there are no user errors', async () => {
      sdk.cartCreate.mockResolvedValue({ cartCreate: { cart: null, userErrors: [] } });

      await expect(CartService.createCart()).rejects.toThrow('Failed to create cart');
    });

    it('throws the first user error when no cart is created', async () => {
      sdk.cartCreate.mockResolvedValue({
        cartCreate: { cart: null, userErrors: [{ message: 'Bad input' }] },
      });

      await expect(CartService.createCart()).rejects.toThrow('Bad input');
      expect(reportError).toHaveBeenCalledWith(
        'CartService.createCart - user errors',
        expect.arrayContaining([expect.objectContaining({ message: 'Bad input' })]),
      );
    });

    it('defaults missing user-error messages before throwing', async () => {
      sdk.cartCreate.mockResolvedValue({
        cartCreate: { cart: null, userErrors: [{}] },
      });

      await expect(CartService.createCart()).rejects.toThrow('An error occurred');
    });

    it('falls back when the mapped user error has no message', async () => {
      const sparse = new Array(1) as unknown as Array<{ message?: string }>;
      sdk.cartCreate.mockResolvedValue({
        cartCreate: { cart: null, userErrors: sparse },
      });

      await expect(CartService.createCart()).rejects.toThrow(
        'Failed to create cart due to validation errors',
      );
    });

    it('returns the cart when user errors accompany a created cart', async () => {
      sdk.cartCreate.mockResolvedValue({
        cartCreate: { cart: { id: NEW_CART }, userErrors: [{ message: 'Minor' }] },
      });

      const cart = await CartService.createCart();

      expect(cart).toEqual({ id: NEW_CART });
      expect(reportError).toHaveBeenCalledWith(
        'CartService.createCart - user errors',
        expect.anything(),
      );
    });
  });

  describe('updateLines', () => {
    it('updates quantities on the stored cart', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartLinesUpdate.mockResolvedValue({
        cartLinesUpdate: { cart: { id: EXISTING_CART, totalQuantity: 2 }, userErrors: [] },
      });

      const cart = await CartService.updateLines([{ id: 'line-1', quantity: 2 }]);

      expect(sdk.cartLinesUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ cartId: EXISTING_CART }),
      );
      expect(cart).toEqual({ id: EXISTING_CART, totalQuantity: 2 });
    });
  });

  describe('removeLine', () => {
    it('removes the line on the stored cart', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartLinesRemove.mockResolvedValue({
        cartLinesRemove: { cart: { id: EXISTING_CART, totalQuantity: 0 }, userErrors: [] },
      });

      const cart = await CartService.removeLine('line-1');

      expect(sdk.cartLinesRemove).toHaveBeenCalledWith(
        expect.objectContaining({ cartId: EXISTING_CART, lineIds: ['line-1'] }),
      );
      expect(cart).toEqual({ id: EXISTING_CART, totalQuantity: 0 });
    });
  });

  describe('updateDiscountCodes', () => {
    it('updates discount codes on the stored cart', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartDiscountCodesUpdate.mockResolvedValue({
        cartDiscountCodesUpdate: { cart: { id: EXISTING_CART }, userErrors: [] },
      });

      const cart = await CartService.updateDiscountCodes(['SAVE10']);

      expect(sdk.cartDiscountCodesUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ cartId: EXISTING_CART, discountCodes: ['SAVE10'] }),
      );
      expect(cart).toEqual({ id: EXISTING_CART });
    });
  });

  describe('updateGiftCardCodes', () => {
    it('replaces the gift card codes on the stored cart', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartGiftCardCodesUpdate.mockResolvedValue({
        cartGiftCardCodesUpdate: { cart: { id: EXISTING_CART }, userErrors: [] },
      });

      const cart = await CartService.updateGiftCardCodes(['GC-1234']);

      expect(sdk.cartGiftCardCodesUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ cartId: EXISTING_CART, giftCardCodes: ['GC-1234'] }),
      );
      expect(cart).toEqual({ id: EXISTING_CART });
    });
  });

  describe('removeGiftCardCode', () => {
    it('detaches one applied gift card by id', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartGiftCardCodesRemove.mockResolvedValue({
        cartGiftCardCodesRemove: { cart: { id: EXISTING_CART }, userErrors: [] },
      });

      const cart = await CartService.removeGiftCardCode('gid://shopify/AppliedGiftCard/1');

      expect(sdk.cartGiftCardCodesRemove).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedGiftCardIds: ['gid://shopify/AppliedGiftCard/1'],
          cartId: EXISTING_CART,
        }),
      );
      expect(cart).toEqual({ id: EXISTING_CART });
    });
  });

  describe('updateNote', () => {
    it('saves the order note on the stored cart', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartNoteUpdate.mockResolvedValue({
        cartNoteUpdate: { cart: { id: EXISTING_CART }, userErrors: [] },
      });

      const cart = await CartService.updateNote('Leave at the door');

      expect(sdk.cartNoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ cartId: EXISTING_CART, note: 'Leave at the door' }),
      );
      expect(cart).toEqual({ id: EXISTING_CART });
    });
  });

  describe('updateAttributes', () => {
    it('replaces the cart attributes on the stored cart', async () => {
      cookieGet.mockReturnValue({ value: EXISTING_CART });
      sdk.cartAttributesUpdate.mockResolvedValue({
        cartAttributesUpdate: { cart: { id: EXISTING_CART }, userErrors: [] },
      });

      const attributes = [{ key: 'gift_wrap', value: 'true' }];
      const cart = await CartService.updateAttributes(attributes);

      expect(sdk.cartAttributesUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ attributes, cartId: EXISTING_CART }),
      );
      expect(cart).toEqual({ id: EXISTING_CART });
    });
  });
});
