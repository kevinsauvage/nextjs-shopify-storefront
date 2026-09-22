import { formatDate, formatPrice } from './format';

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

describe('formatDate', () => {
  const date = new Date(Date.UTC(2024, 0, 5));

  it('formats with the default long format', () => {
    expect(formatDate(date)).toBe('Friday, January 5, 2024');
  });

  it('accepts custom options', () => {
    expect(formatDate(date, { month: 'short', year: 'numeric' })).toBe('Jan 2024');
  });

  it('formats in UTC regardless of the runtime timezone', () => {
    // 00:30Z is still the previous day in any negative-offset timezone, so a
    // local-time format would differ between server and client. Pinning to UTC
    // keeps the output stable (no hydration mismatch).
    expect(formatDate('2024-01-05T00:30:00.000Z')).toBe('Friday, January 5, 2024');
  });

  it('returns the fallback for missing or invalid values', () => {
    expect(formatDate(undefined)).toBe('N/A');
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate('')).toBe('N/A');
    expect(formatDate('not-a-date')).toBe('N/A');
  });
});
