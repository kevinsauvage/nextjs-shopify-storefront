import { getQuantityCap } from './inventory';

import { describe, expect, it } from 'vitest';

describe('getQuantityCap', () => {
  it('treats untracked inventory as unlimited', () => {
    expect(getQuantityCap(null)).toBeUndefined();
    expect(getQuantityCap(undefined)).toBeUndefined();
  });

  it('treats zero or negative values as unlimited', () => {
    expect(getQuantityCap(0)).toBeUndefined();
    expect(getQuantityCap(-3)).toBeUndefined();
  });

  it('returns the cap when inventory is tracked', () => {
    expect(getQuantityCap(1)).toBe(1);
    expect(getQuantityCap(42)).toBe(42);
  });
});
