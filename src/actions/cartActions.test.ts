import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addLines, getCartId, rateLimited, removeLine, updateDiscountCodes, updateLines } =
  vi.hoisted(() => ({
    addLines: vi.fn(),
    getCartId: vi.fn(async () => 'cart-1'),
    rateLimited: vi.fn(async () => false),
    removeLine: vi.fn(),
    updateDiscountCodes: vi.fn(),
    updateLines: vi.fn(),
  }));

vi.mock('@/lib/server/client-ip', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/client-ip')>();

  return { ...actual, getClientIp: async () => '1.2.3.4' };
});
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/services/cart.service', () => ({
  CartService: { addLines, getCartId, removeLine, updateDiscountCodes, updateLines },
}));

import {
  addCartLinesAction,
  removeCartLineAction,
  updateCartLinesAction,
  updateDiscountCodesAction,
} from './cartActions';

const CART = { id: 'cart-1' };

const INVALID_CART_ITEM = 'Invalid cart item';
const INVALID_CART_UPDATE = 'Invalid cart update';
const INVALID_CART_LINE = 'Invalid cart line';
const INVALID_DISCOUNT_CODE = 'Invalid discount code';

const line = (quantity: number) => ({ merchandiseId: 'gid://variant/1', quantity });

describe('addCartLinesAction', () => {
  beforeEach(() => {
    addLines.mockReset();
    addLines.mockResolvedValue(CART);
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('passes a valid line through to the cart service', async () => {
    const result = await addCartLinesAction([line(1)]);

    expect(addLines).toHaveBeenCalledWith([{ merchandiseId: 'gid://variant/1', quantity: 1 }]);
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
      merchandiseId: `gid://variant/${index}`,
      quantity: 1,
    }));

    await expect(addCartLinesAction(lines)).rejects.toThrow(INVALID_CART_ITEM);
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
    const result = await updateCartLinesAction([{ id: 'line-1', quantity: 2 }]);

    expect(updateLines).toHaveBeenCalledWith([{ id: 'line-1', quantity: 2 }]);
    expect(result).toEqual({ data: CART, message: 'Cart updated successfully' });
  });

  it('rejects an out-of-range quantity', async () => {
    await expect(updateCartLinesAction([{ id: 'line-1', quantity: 0 }])).rejects.toThrow(
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
    const result = await removeCartLineAction('line-1');

    expect(removeLine).toHaveBeenCalledWith('line-1');
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
