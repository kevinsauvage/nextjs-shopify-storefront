import { getQuantityCap, isLowStock, isSoldOut } from './inventory';

import { describe, expect, it } from 'vitest';

describe('getQuantityCap', () => {
  it('treats untracked inventory as unlimited', () => {
    expect(getQuantityCap(null)).toBeUndefined();
    expect(getQuantityCap(undefined)).toBeUndefined();
  });

  it('treats tracked zero as out of stock', () => {
    expect(getQuantityCap(0)).toBe(0);
  });

  it('clamps negative values to zero', () => {
    expect(getQuantityCap(-3)).toBe(0);
  });

  it('returns the cap when inventory is tracked', () => {
    expect(getQuantityCap(1)).toBe(1);
    expect(getQuantityCap(42)).toBe(42);
  });
});

describe('isSoldOut', () => {
  it('is true only when explicitly flagged unavailable', () => {
    expect(isSoldOut(false)).toBe(true);
    expect(isSoldOut(true)).toBe(false);
    expect(isSoldOut(undefined)).toBe(false);
  });
});

describe('isLowStock', () => {
  it('flags small positive tracked quantities on sellable variants', () => {
    expect(isLowStock(1, true)).toBe(true);
    expect(isLowStock(4, true)).toBe(true);
  });

  it('ignores untracked, zero, abundant or unsellable inventory', () => {
    expect(isLowStock(null, true)).toBe(false);
    expect(isLowStock(undefined, true)).toBe(false);
    expect(isLowStock(0, true)).toBe(false);
    expect(isLowStock(5, true)).toBe(false);
    expect(isLowStock(3, false)).toBe(false);
  });
});
