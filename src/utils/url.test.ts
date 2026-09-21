import { normalizeMenuHref } from './url';

import { describe, expect, it } from 'vitest';

const STORE_ORIGIN = 'https://ecomfashionstore.myshopify.com';
const RELATIVE_PATH = '/collections/sale';

describe('normalizeMenuHref', () => {
  it('returns relative menu paths unchanged', () => {
    expect(normalizeMenuHref(RELATIVE_PATH)).toBe(RELATIVE_PATH);
  });

  it('preserves query strings on relative paths', () => {
    expect(normalizeMenuHref(`${RELATIVE_PATH}?page=2`)).toBe(`${RELATIVE_PATH}?page=2`);
  });

  it('rewrites absolute Shopify store URLs to relative paths', () => {
    expect(normalizeMenuHref(`${STORE_ORIGIN}${RELATIVE_PATH}`)).toBe(RELATIVE_PATH);
  });

  it('preserves query and hash when rewriting store URLs', () => {
    expect(normalizeMenuHref(`${STORE_ORIGIN}${RELATIVE_PATH}?page=2#top`)).toBe(
      `${RELATIVE_PATH}?page=2#top`,
    );
  });

  it('rewrites bare store URLs to the home path', () => {
    expect(normalizeMenuHref(`${STORE_ORIGIN}/`)).toBe('/');
    expect(normalizeMenuHref(`${STORE_ORIGIN}#`)).toBe('/');
    expect(normalizeMenuHref(STORE_ORIGIN)).toBe('/');
  });

  it('preserves the admin-defined path for any store route', () => {
    expect(normalizeMenuHref(`${STORE_ORIGIN}/password`)).toBe('/password');
    expect(normalizeMenuHref(`${STORE_ORIGIN}/pages/about`)).toBe('/pages/about');
  });

  it('leaves absolute external URLs untouched', () => {
    expect(normalizeMenuHref('https://example.com/support')).toBe('https://example.com/support');
  });

  it('does not treat lookalike domains as Shopify hosts', () => {
    expect(normalizeMenuHref('https://myshopify.com.evil.com/x')).toBe(
      'https://myshopify.com.evil.com/x',
    );
    expect(normalizeMenuHref('https://not-myshopify.com/x')).toBe('https://not-myshopify.com/x');
  });

  it('returns an empty string for missing URLs', () => {
    expect(normalizeMenuHref(undefined)).toBe('');
    expect(normalizeMenuHref(null)).toBe('');
    expect(normalizeMenuHref('')).toBe('');
  });
});
