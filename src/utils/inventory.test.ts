import { getQuantityCap } from './inventory';

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
