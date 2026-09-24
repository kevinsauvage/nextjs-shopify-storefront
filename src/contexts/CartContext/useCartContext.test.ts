import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import { CartContext } from './CartContext';
import useCartContext from './useCartContext';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/actions/cartActions', () => ({
  addCartLinesAction: vi.fn(),
  getCartAction: vi.fn(),
  removeCartLineAction: vi.fn(),
  updateCartLinesAction: vi.fn(),
  updateDiscountCodesAction: vi.fn(),
}));

const renderDefault = (): ReturnType<typeof useCartContext> => {
  let captured: ReturnType<typeof useCartContext> | undefined;
  const Probe = (): null => {
    // eslint-disable-next-line react-hooks/globals -- capture pattern for asserting hook output.
    captured = useCartContext();
    return null;
  };
  renderToString(createElement(Probe));
  if (!captured) throw new Error('useCartContext did not run');

  return captured;
};

describe('useCartContext', () => {
  it('returns the default context value without a provider', async () => {
    expect(CartContext).toBeDefined();
    const value = renderDefault();

    expect(value.cart).toBeNull();
    expect(value.error).toBeNull();
    expect(value.isLoading).toBe(true);

    await expect(value.handleAddToCart('variant-1')).resolves.toBeUndefined();
    await expect(value.handleQuantityChange('line-1', 2)).resolves.toBeUndefined();
    await expect(value.removeFromCart('line-1')).resolves.toBeUndefined();
    await expect(value.updateDiscountCodes(['SAVE10'])).resolves.toBeUndefined();
  });
});
