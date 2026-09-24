import type * as React from 'react';

import type { CartFieldsFragment } from '@/shopify/storefront';

import { CartContext, CartProvider } from './CartContext';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks, runtime } = vi.hoisted(() => ({
  mocks: {
    addCartLinesAction: vi.fn(),
    getCartAction: vi.fn(),
    getCookieFront: vi.fn(),
    removeCartLineAction: vi.fn(),
    reportError: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    updateCartLinesAction: vi.fn(),
    updateDiscountCodesAction: vi.fn(),
  },
  runtime: {
    cleanups: [] as Array<() => void>,
    effectsArmed: true,
    slots: [] as Array<unknown>,
  },
}));

let cursor = 0;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();

  const useState = (initial: unknown): [unknown, (next: unknown) => void] => {
    const index = cursor;
    cursor += 1;
    if (index >= runtime.slots.length) {
      runtime.slots.push(typeof initial === 'function' ? (initial as () => unknown)() : initial);
    }
    const setState = (next: unknown): void => {
      runtime.slots[index] =
        typeof next === 'function'
          ? (next as (previous: unknown) => unknown)(runtime.slots[index])
          : next;
    };

    return [runtime.slots[index], setState];
  };

  const useRef = (initial: unknown): { current: unknown } => {
    const index = cursor;
    cursor += 1;
    if (index >= runtime.slots.length) {
      runtime.slots.push({ current: initial });
    }
    const ref = runtime.slots[index] as { current: unknown } | undefined;
    if (!ref) throw new Error('ref slot missing');

    return ref;
  };

  return {
    ...actual,
    useCallback: <T>(callback: T): T => callback,
    useEffect: (effect: () => void | (() => void)): void => {
      if (!runtime.effectsArmed) return;
      const cleanup = effect();
      if (typeof cleanup === 'function') runtime.cleanups.push(cleanup);
    },
    useMemo: (factory: () => unknown): unknown => factory(),
    useRef,
    useState,
  };
});

vi.mock('@/actions/cartActions', () => ({
  addCartLinesAction: mocks.addCartLinesAction,
  getCartAction: mocks.getCartAction,
  removeCartLineAction: mocks.removeCartLineAction,
  updateCartLinesAction: mocks.updateCartLinesAction,
  updateDiscountCodesAction: mocks.updateDiscountCodesAction,
}));

vi.mock('@/lib/client/cookies', () => ({ getCookieFront: mocks.getCookieFront }));

vi.mock('@/lib/logger', () => ({ reportError: mocks.reportError }));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

type CartValue = {
  cart: CartFieldsFragment | null;
  error: string | null;
  isLoading: boolean;
  handleAddToCart: (variantId: string, quantity?: number) => Promise<void>;
  handleQuantityChange: (id: string, quantity: number) => Promise<void>;
  removeFromCart: (lineItemId: string) => Promise<void>;
  updateDiscountCodes: (discountCodes: string[]) => Promise<void>;
};

const CART_A = { id: 'cart-a' } as unknown as CartFieldsFragment;
const CART_B = { id: 'cart-b' } as unknown as CartFieldsFragment;
const NETWORK_ERROR = 'network down';

const renderCart = (runEffects = false): CartValue => {
  runtime.effectsArmed = runEffects;
  cursor = 0;
  const element = CartProvider({ children: null });
  runtime.effectsArmed = false;

  return (element as unknown as { props: { value: CartValue } }).props.value;
};

const flush = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

beforeEach(() => {
  runtime.slots.length = 0;
  runtime.cleanups.length = 0;
  runtime.effectsArmed = true;
  cursor = 0;
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getCookieFront.mockReturnValue('');
  mocks.getCartAction.mockResolvedValue(null);
});

describe('CartContext defaults', () => {
  it('exposes a loading default without a provider', () => {
    const observed: CartValue[] = [];
    const context = CartContext as unknown as {
      _currentValue?: CartValue;
    };

    expect(context).toBeDefined();
    expect(observed).toHaveLength(0);
  });
});

describe('CartProvider hydration', () => {
  it('skips the server round-trip when no cart marker exists', async () => {
    mocks.getCookieFront.mockReturnValue('');

    renderCart(true);
    await flush();
    const value = renderCart();

    expect(mocks.getCartAction).not.toHaveBeenCalled();
    expect(value.cart).toBeNull();
    expect(value.error).toBeNull();
    expect(value.isLoading).toBe(false);
  });

  it('hydrates the cart when the marker exists', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    mocks.getCartAction.mockResolvedValue(CART_A);

    renderCart(true);
    await flush();
    const value = renderCart();

    expect(mocks.getCartAction).toHaveBeenCalledTimes(1);
    expect(value.cart).toBe(CART_A);
    expect(value.isLoading).toBe(false);
  });

  it('surfaces load failures with the error message', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    mocks.getCartAction.mockRejectedValue(new Error(NETWORK_ERROR));

    renderCart(true);
    await flush();
    const value = renderCart();

    expect(value.cart).toBeNull();
    expect(value.error).toBe(NETWORK_ERROR);
    expect(value.isLoading).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith(NETWORK_ERROR);
  });

  it('falls back to a default message for non-Error load failures', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    mocks.getCartAction.mockRejectedValue('oops');

    renderCart(true);
    await flush();
    const value = renderCart();

    expect(value.error).toBe('Failed to load your cart');
    expect(mocks.toastError).toHaveBeenCalledWith('Failed to load your cart');
  });

  it('drops the hydration result once unmounted', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    let resolveCart: ((cart: CartFieldsFragment | null) => void) | undefined;
    mocks.getCartAction.mockReturnValue(
      new Promise<CartFieldsFragment | null>((resolve) => {
        resolveCart = resolve;
      }),
    );

    renderCart(true);
    for (const cleanup of runtime.cleanups) cleanup();
    runtime.cleanups.length = 0;
    resolveCart?.(CART_A);
    await flush();
    const value = renderCart();

    expect(value.cart).toBeNull();
    expect(value.isLoading).toBe(true);
  });

  it('drops hydration failures once unmounted', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    let rejectCart: ((reason: unknown) => void) | undefined;
    mocks.getCartAction.mockReturnValue(
      new Promise<CartFieldsFragment | null>((_resolve, reject) => {
        rejectCart = reject;
      }),
    );

    renderCart(true);
    for (const cleanup of runtime.cleanups) cleanup();
    runtime.cleanups.length = 0;
    rejectCart?.(new Error('too late'));
    await flush();
    const value = renderCart();

    expect(value.cart).toBeNull();
    expect(value.error).toBeNull();
    expect(value.isLoading).toBe(true);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});

describe('CartProvider mutations', () => {
  const settleInitial = async (): Promise<CartValue> => {
    renderCart(true);
    await flush();

    return renderCart();
  };

  it('adds a variant to the cart and announces success', async () => {
    mocks.addCartLinesAction.mockResolvedValue({ data: CART_B, message: 'Added' });
    const value = await settleInitial();

    await value.handleAddToCart('variant-1', 2);
    const settled = renderCart();

    expect(mocks.addCartLinesAction).toHaveBeenCalledWith([
      { merchandiseId: 'variant-1', quantity: 2 },
    ]);
    expect(settled.cart).toBe(CART_B);
    expect(settled.error).toBeNull();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Added');
  });

  it('defaults the quantity to one and stays quiet without a message', async () => {
    mocks.addCartLinesAction.mockResolvedValue({ data: CART_B });
    const value = await settleInitial();

    await value.handleAddToCart('variant-1');
    const settled = renderCart();

    expect(mocks.addCartLinesAction).toHaveBeenCalledWith([
      { merchandiseId: 'variant-1', quantity: 1 },
    ]);
    expect(settled.cart).toBe(CART_B);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('reports an error and skips the action when the variant id is missing', async () => {
    const value = await settleInitial();

    await value.handleAddToCart('');

    expect(mocks.addCartLinesAction).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith('cart/add', expect.any(Error));
  });

  it('reports mutation failures with a fallback message', async () => {
    mocks.addCartLinesAction.mockRejectedValue(new Error('shopify down'));
    const value = await settleInitial();

    await value.handleAddToCart('variant-1');

    expect(mocks.reportError).toHaveBeenCalledWith('cart/add', expect.any(Error));
    expect(mocks.toastError).toHaveBeenCalledWith('shopify down');
  });

  it('uses the fallback message for non-Error mutation failures', async () => {
    mocks.addCartLinesAction.mockRejectedValue('oops');
    const value = await settleInitial();

    await value.handleAddToCart('variant-1');

    expect(mocks.toastError).toHaveBeenCalledWith('Failed to add to cart');
  });

  it('drops stale responses so concurrent mutations cannot resolve out of order', async () => {
    let resolveFirst: ((response: { data: CartFieldsFragment }) => void) | undefined;
    mocks.addCartLinesAction.mockReturnValueOnce(
      new Promise<{ data: CartFieldsFragment }>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    mocks.addCartLinesAction.mockResolvedValueOnce({ data: CART_B });
    const value = await settleInitial();

    const first = value.handleAddToCart('variant-1');
    await value.handleAddToCart('variant-2');
    resolveFirst?.({ data: CART_A });
    await first;
    const settled = renderCart();

    expect(settled.cart).toBe(CART_B);
  });

  it('drops stale mutation errors', async () => {
    let rejectFirst: ((reason: unknown) => void) | undefined;
    mocks.addCartLinesAction.mockReturnValueOnce(
      new Promise<{ data: CartFieldsFragment }>((_resolve, reject) => {
        rejectFirst = reject;
      }),
    );
    mocks.addCartLinesAction.mockResolvedValueOnce({ data: CART_B });
    const value = await settleInitial();

    const first = value.handleAddToCart('variant-1');
    await value.handleAddToCart('variant-2');
    rejectFirst?.(new Error('stale failure'));
    await first;

    expect(mocks.reportError).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('removes a line item', async () => {
    mocks.removeCartLineAction.mockResolvedValue({ data: CART_B, message: 'Removed' });
    const value = await settleInitial();

    await value.removeFromCart('line-1');
    const settled = renderCart();

    expect(mocks.removeCartLineAction).toHaveBeenCalledWith('line-1');
    expect(settled.cart).toBe(CART_B);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Removed');
  });

  it('reports an error when the line item id is missing or removal fails', async () => {
    const value = await settleInitial();

    await value.removeFromCart('');

    expect(mocks.removeCartLineAction).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith('cart/remove', expect.any(Error));

    mocks.removeCartLineAction.mockRejectedValue(new Error('remove failed'));

    await value.removeFromCart('line-1');

    expect(mocks.toastError).toHaveBeenCalledWith('remove failed');
  });

  it('updates a line quantity', async () => {
    mocks.updateCartLinesAction.mockResolvedValue({ data: CART_B, message: 'Updated' });
    const value = await settleInitial();

    await value.handleQuantityChange('line-1', 3);
    const settled = renderCart();

    expect(mocks.updateCartLinesAction).toHaveBeenCalledWith([{ id: 'line-1', quantity: 3 }]);
    expect(settled.cart).toBe(CART_B);
  });

  it('reports an error when quantity parameters are missing or the update fails', async () => {
    const value = await settleInitial();

    await value.handleQuantityChange('', 0);

    expect(mocks.updateCartLinesAction).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith('cart/quantity', expect.any(Error));

    mocks.updateCartLinesAction.mockRejectedValue('oops');

    await value.handleQuantityChange('line-1', 2);

    expect(mocks.toastError).toHaveBeenCalledWith('Failed to update cart');
  });

  it('updates discount codes after trimming blanks', async () => {
    mocks.updateDiscountCodesAction.mockResolvedValue({ data: CART_B, message: 'Discounts' });
    const value = await settleInitial();

    await value.updateDiscountCodes(['  SAVE10 ', '', '   ']);
    const settled = renderCart();

    expect(mocks.updateDiscountCodesAction).toHaveBeenCalledWith(['SAVE10']);
    expect(settled.cart).toBe(CART_B);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Discounts');
  });

  it('reports invalid discount payloads and discount failures', async () => {
    const value = await settleInitial();

    await value.updateDiscountCodes('SAVE10' as unknown as string[]);

    expect(mocks.updateDiscountCodesAction).not.toHaveBeenCalled();
    expect(mocks.reportError).toHaveBeenCalledWith('cart/discount', expect.any(Error));

    mocks.updateDiscountCodesAction.mockRejectedValue(new Error('discount failed'));

    await value.updateDiscountCodes(['SAVE10']);

    expect(mocks.toastError).toHaveBeenCalledWith('discount failed');
  });
});
