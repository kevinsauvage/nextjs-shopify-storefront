import type * as React from 'react';

import type { GetProductByHandleQuery, ProductFieldsFragment } from '@/shopify/storefront';

import useProductSelection, { type ProductVariant } from './useProductSelection';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addToCart, states } = vi.hoisted(() => ({
  addToCart: vi.fn(),
  states: [] as Array<unknown>,
}));

let cursor = 0;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();

  const useState = (initial: unknown): [unknown, (next: unknown) => void] => {
    const index = cursor;
    cursor += 1;
    if (index >= states.length) {
      states.push(typeof initial === 'function' ? (initial as () => unknown)() : initial);
    }
    const setState = (next: unknown): void => {
      states[index] =
        typeof next === 'function' ? (next as (previous: unknown) => unknown)(states[index]) : next;
    };

    return [states[index], setState];
  };

  return {
    ...actual,
    useCallback: <T>(callback: T): T => callback,
    useMemo: (factory: () => unknown): unknown => factory(),
    useState,
  };
});

vi.mock('@/contexts/CartContext/useCartContext', () => ({
  default: () => ({ handleAddToCart: addToCart }),
}));

type Product = NonNullable<GetProductByHandleQuery['product']>;
type ProductInput = GetProductByHandleQuery['product'] | null | undefined;

type OptionValue = ProductFieldsFragment['options'][number]['optionValues'][number];

const optionValue = (name: string): OptionValue => ({ name }) as unknown as OptionValue;

const makeVariant = (
  id: string,
  color: string,
  size: string,
  price = '10.00',
  availableForSale = true,
): ProductVariant =>
  ({
    availableForSale,
    id,
    price: { amount: price, currencyCode: 'USD' },
    selectedOptions: [
      { name: 'Color', value: color },
      { name: 'Size', value: size },
    ],
  }) as unknown as ProductVariant;

const makeProduct = (variants: ProductVariant[]): Product =>
  ({
    variants: { edges: variants.map((node) => ({ node })) },
  }) as unknown as Product;

const VARIANT_1_ID = 'gid://shopify/ProductVariant/1';

const redSmall = (): ProductVariant => makeVariant(VARIANT_1_ID, 'Red', 'S');
const blueMedium = (): ProductVariant =>
  makeVariant('gid://shopify/ProductVariant/2', 'Blue', 'M', '20.00');

const fullProduct = (): Product => makeProduct([redSmall(), blueMedium()]);

const renderSelection = (product: ProductInput): ReturnType<typeof useProductSelection> => {
  cursor = 0;

  // eslint-disable-next-line react-hooks/rules-of-hooks -- harness drives the hook against a mocked runtime.
  return useProductSelection({ product });
};

beforeEach(() => {
  states.length = 0;
  cursor = 0;
  addToCart.mockReset();
  addToCart.mockResolvedValue(undefined);
});

describe('useProductSelection', () => {
  it('initialises the selection from the first variant', () => {
    const selection = renderSelection(fullProduct());

    expect(selection.selectedVariant?.id).toBe(VARIANT_1_ID);
    expect(selection.quantity).toBe(1);
    expect(selection.totalPrice).toBe(10);
    expect(selection.isAdding).toBe(false);
    expect(selection.isSelectionUnavailable).toBe(false);
  });

  it('handles a missing product or an empty variant list', () => {
    for (const product of [null, undefined, makeProduct([])]) {
      states.length = 0;
      const selection = renderSelection(product);

      expect(selection.selectedVariant).toBeUndefined();
      expect(selection.totalPrice).toBe(0);
      expect(selection.isSelectionUnavailable).toBe(false);
    }
  });

  it('returns a zero total when the selected variant has no price amount', () => {
    const priceless = makeVariant('gid://shopify/ProductVariant/9', 'Red', 'S', '');
    const selection = renderSelection(makeProduct([priceless]));

    expect(selection.totalPrice).toBe(0);
  });

  it('updates the quantity with a minimum of one', () => {
    let selection = renderSelection(fullProduct());

    selection.handleChangeInput(3);
    selection = renderSelection(fullProduct());

    expect(selection.quantity).toBe(3);
    expect(selection.totalPrice).toBe(30);

    selection.handleChangeInput(-4);
    selection = renderSelection(fullProduct());

    expect(selection.quantity).toBe(1);
  });

  it('updates the selection and flags impossible combinations', () => {
    let selection = renderSelection(fullProduct());

    selection.handleSetSelectedProductOption('option-1', 'Color', optionValue('Blue') as never);
    selection = renderSelection(fullProduct());

    expect(selection.selectedVariant).toBeUndefined();
    expect(selection.isSelectionUnavailable).toBe(true);

    selection.handleSetSelectedProductOption('option-2', 'Size', optionValue('M') as never);
    selection = renderSelection(fullProduct());

    expect(selection.selectedVariant?.id).toBe('gid://shopify/ProductVariant/2');
    expect(selection.isSelectionUnavailable).toBe(false);
  });

  it('reports which option values are selected or out of stock', () => {
    const selection = renderSelection(fullProduct());

    expect(selection.isOptionSelected('Color', optionValue('Red') as never)).toBe(true);
    expect(selection.isOptionSelected('Color', optionValue('Blue') as never)).toBe(false);
    expect(selection.isOptionOutOfStock('Color', optionValue('Red') as never)).toBe(false);
    expect(selection.isOptionOutOfStock('Size', optionValue('M') as never)).toBe(true);
    expect(selection.isOptionOutOfStock('Color', undefined as unknown as never)).toBe(true);
  });

  it('adds the selected variant to the cart and resets the adding flag', async () => {
    const selection = renderSelection(fullProduct());

    selection.handleAddToCart();

    expect(addToCart).toHaveBeenCalledWith(VARIANT_1_ID, 1);

    await Promise.resolve();
    await Promise.resolve();
    const settled = renderSelection(fullProduct());

    expect(settled.isAdding).toBe(false);
    expect(addToCart).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no variant is selected', async () => {
    const selection = renderSelection(null);

    await selection.handleAddToCart();

    expect(addToCart).not.toHaveBeenCalled();
  });

  it('ignores a second add while the first is still in flight', async () => {
    let release: (() => void) | undefined;
    addToCart.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const selection = renderSelection(fullProduct());

    const first = selection.handleAddToCart();
    const second = renderSelection(fullProduct());

    await second.handleAddToCart();
    expect(addToCart).toHaveBeenCalledTimes(1);

    release?.();
    await first;
    const settled = renderSelection(fullProduct());

    expect(settled.isAdding).toBe(false);
  });
});
