import {
  findVariantForSelection,
  isOptionValueOutOfStock,
  isSelectionUnavailable,
} from './productSelection';

import { describe, expect, it } from 'vitest';

type Variant = {
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
};

const variant = (color: string, size: string, availableForSale = true): Variant => ({
  availableForSale,
  selectedOptions: [
    { name: 'Color', value: color },
    { name: 'Size', value: size },
  ],
});

const variants: Variant[] = [variant('Red', 'S'), variant('Blue', 'M')];

describe('findVariantForSelection', () => {
  it('returns the exact matching variant', () => {
    expect(findVariantForSelection(variants, { Color: 'Red', Size: 'S' })).toBe(variants[0]);
  });

  it('returns undefined for an impossible combination instead of a fallback', () => {
    expect(findVariantForSelection(variants, { Color: 'Red', Size: 'M' })).toBeUndefined();
  });

  it('returns undefined when there are no variants', () => {
    expect(findVariantForSelection([], { Color: 'Red', Size: 'S' })).toBeUndefined();
    expect(findVariantForSelection([], {})).toBeUndefined();
  });

  it('falls back to the first variant only when nothing is selected', () => {
    expect(findVariantForSelection(variants, {})).toBe(variants[0]);
  });
});

describe('isSelectionUnavailable', () => {
  it('is false for a valid combination', () => {
    expect(isSelectionUnavailable(variants, { Color: 'Blue', Size: 'M' })).toBe(false);
  });

  it('is true for an impossible combination', () => {
    expect(isSelectionUnavailable(variants, { Color: 'Red', Size: 'M' })).toBe(true);
  });

  it('is false before any option is chosen', () => {
    expect(isSelectionUnavailable(variants, {})).toBe(false);
  });
});

describe('isOptionValueOutOfStock', () => {
  it('is false for a value that combines with the current selection', () => {
    expect(isOptionValueOutOfStock(variants, { Color: 'Red', Size: 'S' }, 'Color', 'Red')).toBe(
      false,
    );
  });

  it('is true when the value cannot combine with the rest of the selection', () => {
    expect(isOptionValueOutOfStock(variants, { Color: 'Red', Size: 'S' }, 'Size', 'M')).toBe(true);
    expect(isOptionValueOutOfStock(variants, { Color: 'Red', Size: 'S' }, 'Color', 'Blue')).toBe(
      true,
    );
  });

  it('does not disable every value once the selection is impossible (recovery)', () => {
    const impossible = { Color: 'Red', Size: 'M' };

    expect(isSelectionUnavailable(variants, impossible)).toBe(true);
    // Blue is offered by an available variant, so it stays selectable.
    expect(isOptionValueOutOfStock(variants, impossible, 'Color', 'Blue')).toBe(false);
    // Green is not offered by any available variant.
    expect(isOptionValueOutOfStock(variants, impossible, 'Color', 'Green')).toBe(true);
  });

  it('treats a sold-out variant value as out of stock', () => {
    const withSoldOut = [variant('Red', 'S', false), variant('Blue', 'M')];

    expect(isOptionValueOutOfStock(withSoldOut, { Color: 'Blue', Size: 'M' }, 'Color', 'Red')).toBe(
      true,
    );
    expect(
      isOptionValueOutOfStock(withSoldOut, { Color: 'Blue', Size: 'M' }, 'Color', 'Blue'),
    ).toBe(false);
  });
});
