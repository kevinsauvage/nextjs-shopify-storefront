import { formatPrice } from './format';

import { describe, expect, it } from 'vitest';

describe('formatPrice', () => {
  it('formats string amounts as currency', () => {
    expect(formatPrice('12.99', 'USD')).toBe('$12.99');
  });

  it('formats numeric amounts as currency', () => {
    expect(formatPrice(10, 'USD')).toBe('$10.00');
  });

  it('falls back to plain formatting for invalid currency codes', () => {
    expect(formatPrice('5.5', 'not-a-currency')).toBe('not-a-currency 5.50');
  });
});
