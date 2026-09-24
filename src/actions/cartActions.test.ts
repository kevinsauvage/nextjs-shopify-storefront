import type * as ClientIpModule from '@/lib/server/client-ip';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addLines,
  getCart,
  getCartId,
  getOrderById,
  getShopifyToken,
  rateLimited,
  removeLine,
  updateDiscountCodes,
  updateLines,
} = vi.hoisted(() => ({
  addLines: vi.fn(),
  getCart: vi.fn(),
  getCartId: vi.fn(async (): Promise<string | null> => 'cart-1'),
  getOrderById: vi.fn(),
  getShopifyToken: vi.fn(),
  rateLimited: vi.fn(async () => false),
  removeLine: vi.fn(),
  updateDiscountCodes: vi.fn(),
  updateLines: vi.fn(),
}));

vi.mock('@/lib/server/client-ip', async (importOriginal) => {
  const actual = await importOriginal<typeof ClientIpModule>();

  return { ...actual, getClientIp: async () => '1.2.3.4' };
});
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/server/account', () => ({ getOrderById }));
vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken }));
vi.mock('@/services/cart.service', () => ({
  CartService: { addLines, getCart, getCartId, removeLine, updateDiscountCodes, updateLines },
}));

import {
  addCartLinesAction,
  getCartAction,
  removeCartLineAction,
  reorderAction,
  updateCartLinesAction,
  updateDiscountCodesAction,
} from './cartActions';

const CART = { id: 'cart-1' };

const INVALID_CART_ITEM = 'Invalid cart item';
const INVALID_CART_UPDATE = 'Invalid cart update';
const INVALID_CART_LINE = 'Invalid cart line';
const INVALID_DISCOUNT_CODE = 'Invalid discount code';

const line = (quantity: number) => ({
  merchandiseId: 'gid://shopify/ProductVariant/1',
  quantity,
});

const LINE_ID = 'gid://shopify/CartLine/1';

describe('addCartLinesAction', () => {
  beforeEach(() => {
    addLines.mockReset();
    addLines.mockResolvedValue(CART);
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('passes a valid line through to the cart service', async () => {
    const result = await addCartLinesAction([line(1)]);

    expect(addLines).toHaveBeenCalledWith([
      { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 },
    ]);
    expect(result).toEqual({ data: CART, message: 'Product added successfully' });
  });

  it('accepts the maximum quantity of 99', async () => {
    await addCartLinesAction([line(99)]);

    expect(addLines).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 100, 1.5])('rejects an out-of-range quantity (%s)', async (quantity) => {
    await expect(addCartLinesAction([line(quantity)])).rejects.toThrow(INVALID_CART_ITEM);
    expect(addLines).not.toHaveBeenCalled();
  });

  it('rejects an empty line list', async () => {
    await expect(addCartLinesAction([])).rejects.toThrow(INVALID_CART_ITEM);
  });

  it('rejects more than 50 lines in a single request', async () => {
    const lines = Array.from({ length: 51 }, (_, index) => ({
      merchandiseId: `gid://shopify/ProductVariant/${index}`,
      quantity: 1,
    }));

    await expect(addCartLinesAction(lines)).rejects.toThrow(INVALID_CART_ITEM);
    expect(addLines).not.toHaveBeenCalled();
  });

  it('rejects a non-gid merchandise id without a Shopify round-trip', async () => {
    await expect(addCartLinesAction([{ merchandiseId: 'variant-1', quantity: 1 }])).rejects.toThrow(
      INVALID_CART_ITEM,
    );
    expect(addLines).not.toHaveBeenCalled();
  });

  it('rejects an empty merchandise id', async () => {
    await expect(addCartLinesAction([{ merchandiseId: '', quantity: 1 }])).rejects.toThrow(
      INVALID_CART_ITEM,
    );
  });

  it('rejects when rate limited before touching the cart', async () => {
    rateLimited.mockResolvedValueOnce(true);

    await expect(addCartLinesAction([line(1)])).rejects.toThrow('Too many cart updates');
    expect(addLines).not.toHaveBeenCalled();
  });

  it('keys the cart bucket by ip and cart id and fails closed', async () => {
    await addCartLinesAction([line(1)]);

    expect(rateLimited).toHaveBeenCalledWith('cart:write', '1.2.3.4:cart-1', 60, '1 m', {
      failClosed: true,
    });
  });
});

describe('updateCartLinesAction', () => {
  beforeEach(() => {
    updateLines.mockReset();
    updateLines.mockResolvedValue(CART);
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('passes a valid update through to the cart service', async () => {
    const result = await updateCartLinesAction([{ id: LINE_ID, quantity: 2 }]);

    expect(updateLines).toHaveBeenCalledWith([{ id: LINE_ID, quantity: 2 }]);
    expect(result).toEqual({ data: CART, message: 'Cart updated successfully' });
  });

  it('rejects an out-of-range quantity', async () => {
    await expect(updateCartLinesAction([{ id: LINE_ID, quantity: 0 }])).rejects.toThrow(
      INVALID_CART_UPDATE,
    );
    expect(updateLines).not.toHaveBeenCalled();
  });

  it('rejects a non-gid line id without a Shopify round-trip', async () => {
    await expect(updateCartLinesAction([{ id: 'line-1', quantity: 2 }])).rejects.toThrow(
      INVALID_CART_UPDATE,
    );
    expect(updateLines).not.toHaveBeenCalled();
  });
});

describe('removeCartLineAction', () => {
  beforeEach(() => {
    removeLine.mockReset();
    removeLine.mockResolvedValue(CART);
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('passes a valid line id through to the cart service', async () => {
    const result = await removeCartLineAction(LINE_ID);

    expect(removeLine).toHaveBeenCalledWith(LINE_ID);
    expect(result).toEqual({ data: CART, message: 'Product removed successfully' });
  });

  it('rejects an empty line id', async () => {
    await expect(removeCartLineAction('')).rejects.toThrow(INVALID_CART_LINE);
    expect(removeLine).not.toHaveBeenCalled();
  });
});

describe('updateDiscountCodesAction', () => {
  beforeEach(() => {
    updateDiscountCodes.mockReset();
    updateDiscountCodes.mockResolvedValue(CART);
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('trims and passes valid codes through to the cart service', async () => {
    await updateDiscountCodesAction(['  SAVE10  ', 'FREESHIP']);

    expect(updateDiscountCodes).toHaveBeenCalledWith(['SAVE10', 'FREESHIP']);
  });

  it('rejects more than 20 codes', async () => {
    const codes = Array.from({ length: 21 }, (_, index) => `CODE${index}`);

    await expect(updateDiscountCodesAction(codes)).rejects.toThrow(INVALID_DISCOUNT_CODE);
    expect(updateDiscountCodes).not.toHaveBeenCalled();
  });

  it('rejects blank codes', async () => {
    await expect(updateDiscountCodesAction(['   '])).rejects.toThrow(INVALID_DISCOUNT_CODE);
  });

  it('rejects codes longer than 64 characters', async () => {
    await expect(updateDiscountCodesAction(['x'.repeat(65)])).rejects.toThrow(
      INVALID_DISCOUNT_CODE,
    );
  });
});

describe('getCartAction', () => {
  beforeEach(() => {
    getCart.mockReset();
    getCartId.mockReset();
    getCartId.mockResolvedValue('cart-1');
    getCart.mockResolvedValue(CART);
  });

  it('returns null when there is no cart yet', async () => {
    getCartId.mockResolvedValue(null);

    await expect(getCartAction()).resolves.toBeNull();
    expect(getCart).not.toHaveBeenCalled();
  });

  it('returns the hydrated cart', async () => {
    await expect(getCartAction()).resolves.toEqual(CART);
    expect(getCart).toHaveBeenCalledWith('cart-1');
  });

  it('throws so the UI can surface outages instead of an empty cart', async () => {
    getCart.mockRejectedValue(new Error('network down'));

    await expect(getCartAction()).rejects.toThrow('network down');
  });
});

describe('reorderAction', () => {
  const lineItem = (variantId: string | null, quantity: number, availableForSale = true) => ({
    quantity,
    variant: variantId ? { availableForSale, id: variantId } : null,
  });

  const orderWith = (items: Array<ReturnType<typeof lineItem>>) => ({
    lineItems: { edges: items.map((node) => ({ node })) },
  });

  beforeEach(() => {
    addLines.mockReset();
    addLines.mockResolvedValue(CART);
    getOrderById.mockReset();
    getShopifyToken.mockReset();
    getShopifyToken.mockResolvedValue('customer-token');
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('re-adds every available line and reports the count', async () => {
    getOrderById.mockResolvedValue(
      orderWith([
        lineItem('gid://shopify/ProductVariant/1', 2),
        lineItem('gid://shopify/ProductVariant/2', 1),
      ]),
    );

    const result = await reorderAction('12345');

    expect(getOrderById).toHaveBeenCalledWith('customer-token', '12345');
    expect(addLines).toHaveBeenCalledWith([
      { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 2 },
      { merchandiseId: 'gid://shopify/ProductVariant/2', quantity: 1 },
    ]);
    expect(result).toEqual({ data: CART, message: '2 items added back to your cart' });
  });

  it('skips unavailable variants and reports the skip count', async () => {
    getOrderById.mockResolvedValue(
      orderWith([
        lineItem('gid://shopify/ProductVariant/1', 1),
        lineItem('gid://shopify/ProductVariant/2', 1, false),
        lineItem(null, 1),
      ]),
    );

    const result = await reorderAction('12345');

    expect(addLines).toHaveBeenCalledWith([
      { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 },
    ]);
    expect(result.message).toContain('1 items added back to your cart (2 unavailable skipped)');
  });

  it('clamps quantities to the 99 maximum', async () => {
    getOrderById.mockResolvedValue(orderWith([lineItem('gid://shopify/ProductVariant/1', 500)]));

    await reorderAction('12345');

    expect(addLines).toHaveBeenCalledWith([
      { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 99 },
    ]);
  });

  it('rejects a non-numeric order id without a Shopify round-trip', async () => {
    await expect(reorderAction('../../evil')).rejects.toThrow('Invalid order');
    expect(getOrderById).not.toHaveBeenCalled();
    expect(addLines).not.toHaveBeenCalled();
  });

  it('requires a signed-in customer', async () => {
    getShopifyToken.mockResolvedValue(null);

    await expect(reorderAction('12345')).rejects.toThrow('Please sign in to reorder');
    expect(getOrderById).not.toHaveBeenCalled();
  });

  it('throws when the order does not belong to the customer', async () => {
    getOrderById.mockResolvedValue(null);

    await expect(reorderAction('12345')).rejects.toThrow('Order not found');
    expect(addLines).not.toHaveBeenCalled();
  });

  it('throws when nothing from the order is available anymore', async () => {
    getOrderById.mockResolvedValue(
      orderWith([lineItem('gid://shopify/ProductVariant/2', 1, false)]),
    );

    await expect(reorderAction('12345')).rejects.toThrow('None of the items');
    expect(addLines).not.toHaveBeenCalled();
  });

  it('rejects when rate limited before touching the cart', async () => {
    rateLimited.mockResolvedValueOnce(true);

    await expect(reorderAction('12345')).rejects.toThrow('Too many cart updates');
    expect(addLines).not.toHaveBeenCalled();
  });
});
