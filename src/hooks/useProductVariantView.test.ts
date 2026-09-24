import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import type { ProductVariant } from './useProductSelection';
import useProductVariantView, { type ProductVariantView } from './useProductVariantView';

import { describe, expect, it } from 'vitest';

const variant = (overrides: object = {}): ProductVariant =>
  ({
    availableForSale: true,
    compareAtPrice: null,
    price: { amount: '80.00', currencyCode: 'USD' },
    quantityAvailable: 3,
    sku: 'sku-1',
    title: 'Default Title',
    weight: 100,
    weightUnit: 'GRAMS',
    ...overrides,
  }) as unknown as ProductVariant;

const renderView = (
  selectedVariant: ProductVariant | undefined,
  fallback?: ProductVariantView | null,
): ReturnType<typeof useProductVariantView> => {
  let captured: ReturnType<typeof useProductVariantView> | undefined;
  const Probe = (): null => {
    // eslint-disable-next-line react-hooks/globals -- capture pattern for asserting hook output.
    captured = useProductVariantView(selectedVariant, fallback);
    return null;
  };
  renderToString(createElement(Probe));
  if (!captured) throw new Error('useProductVariantView did not run');

  return captured;
};

describe('useProductVariantView', () => {
  it('derives price, discount and stock cap from the selected variant', () => {
    const view = renderView(variant({ compareAtPrice: { amount: '100.00', currencyCode: 'USD' } }));

    expect(view.price?.amount).toBe('80.00');
    expect(view.hasDiscount).toBe(true);
    expect(view.discountPercent).toBe('20');
    expect(view.quantityAvailable).toBe(3);
    expect(view.quantityCap).toBe(3);
    expect(view.availableForSale).toBe(true);
    expect(view.sku).toBe('sku-1');
    expect(view.title).toBe('Default Title');
    expect(view.weight).toBe(100);
    expect(view.weightUnit).toBe('GRAMS');
  });

  it('reports no discount when the compare-at price is absent or not above the price', () => {
    expect(renderView(variant()).hasDiscount).toBe(false);
    expect(renderView(variant()).discountPercent).toBeNull();

    const equal = renderView(
      variant({
        compareAtPrice: { amount: '80.00', currencyCode: 'USD' },
        price: { amount: '80.00', currencyCode: 'USD' },
      }),
    );

    expect(equal.hasDiscount).toBe(false);
    expect(equal.discountPercent).toBeNull();
  });

  it('falls back to the provided view when no variant is selected', () => {
    const fallback: ProductVariantView = {
      availableForSale: true,
      price: { amount: '12.50', currencyCode: 'USD' },
      quantityAvailable: null,
      title: 'Fallback',
    };

    const view = renderView(undefined, fallback);

    expect(view.price?.amount).toBe('12.50');
    expect(view.title).toBe('Fallback');
    expect(view.quantityCap).toBeUndefined();
    expect(view.hasDiscount).toBe(false);
  });

  it('returns empty fields when neither a variant nor a fallback exists', () => {
    const view = renderView(undefined);

    expect(view.price).toBeUndefined();
    expect(view.compareAtPrice).toBeUndefined();
    expect(view.quantityAvailable).toBeUndefined();
    expect(view.quantityCap).toBeUndefined();
    expect(view.hasDiscount).toBe(false);
    expect(view.discountPercent).toBeNull();
  });

  it('caps the quantity at zero for a tracked-out-of-stock variant', () => {
    const view = renderView(variant({ availableForSale: false, quantityAvailable: 0 }));

    expect(view.availableForSale).toBe(false);
    expect(view.quantityCap).toBe(0);
  });
});
