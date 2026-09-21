import { normalizeMenuHref } from './url';

import { describe, expect, it } from 'vitest';

describe('normalizeMenuHref', () => {
  it('returns relative menu paths unchanged', () => {
    expect(normalizeMenuHref('/collections/sale')).toBe('/collections/sale');
  });

  it('preserves query strings on relative paths', () => {
    expect(normalizeMenuHref('/collections/sale?page=2')).toBe('/collections/sale?page=2');
  });

  it('leaves absolute external URLs untouched', () => {
    expect(normalizeMenuHref('https://example.com/support')).toBe('https://example.com/support');
  });

  it('returns an empty string for missing URLs', () => {
    expect(normalizeMenuHref(undefined)).toBe('');
    expect(normalizeMenuHref(null)).toBe('');
    expect(normalizeMenuHref('')).toBe('');
  });
});
