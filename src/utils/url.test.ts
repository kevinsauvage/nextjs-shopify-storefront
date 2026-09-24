import { isAllowedPasswordResetUrl, normalizeMenuHref, safeInternalPath } from './url';

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
    expect(normalizeMenuHref('http://example.com/support')).toBe('http://example.com/support');
    expect(normalizeMenuHref('mailto:hello@example.com')).toBe('mailto:hello@example.com');
    expect(normalizeMenuHref('tel:+15551234567')).toBe('tel:+15551234567');
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
    expect(normalizeMenuHref('   ')).toBe('');
  });

  it('rejects scriptable protocols so they can never reach a Link href', () => {
    expect(normalizeMenuHref('javascript:alert(1)')).toBe('');
    expect(normalizeMenuHref('JaVaScRiPt:alert(1)')).toBe('');
    expect(normalizeMenuHref('  javascript:alert(1)')).toBe('');
    expect(normalizeMenuHref('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(normalizeMenuHref('vbscript:msgbox(1)')).toBe('');
  });

  it('returns an empty string for unparseable URLs', () => {
    expect(normalizeMenuHref('http://[:::1')).toBe('');
  });
});

describe('safeInternalPath', () => {
  const FALLBACK = '/account';

  it('keeps same-origin relative paths', () => {
    expect(safeInternalPath(RELATIVE_PATH, FALLBACK)).toBe(RELATIVE_PATH);
    expect(safeInternalPath('/account/orders?after=1', FALLBACK)).toBe('/account/orders?after=1');
  });

  it('falls back for absolute, protocol-relative and backslash URLs', () => {
    expect(safeInternalPath('https://evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('//evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('/\\evil.com', FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeInternalPath('', FALLBACK)).toBe(FALLBACK);
  });
});

describe('isAllowedPasswordResetUrl', () => {
  const RESET_URL = `${STORE_ORIGIN}/account/reset/abc123?syclid=token-1`;

  it('accepts an https reset link on the Shopify store host', () => {
    expect(isAllowedPasswordResetUrl(RESET_URL)).toBe(true);
  });

  it('rejects off-store hosts so crafted links cannot drive the reset flow', () => {
    expect(isAllowedPasswordResetUrl('https://evil.com/reset?syclid=token-1')).toBe(false);
    expect(isAllowedPasswordResetUrl('https://myshopify.com.evil.com/reset?syclid=x')).toBe(false);
    expect(isAllowedPasswordResetUrl('https://not-myshopify.com/reset?syclid=x')).toBe(false);
  });

  it('rejects non-https URLs, garbage and missing values', () => {
    expect(isAllowedPasswordResetUrl('http://ecomfashionstore.myshopify.com/reset')).toBe(false);
    expect(isAllowedPasswordResetUrl('not-a-url')).toBe(false);
    expect(isAllowedPasswordResetUrl('/account/reset?syclid=x')).toBe(false);
    expect(isAllowedPasswordResetUrl(undefined)).toBe(false);
    expect(isAllowedPasswordResetUrl('')).toBe(false);
  });

  it('rejects oversized URLs instead of forwarding them to Shopify', () => {
    expect(isAllowedPasswordResetUrl(`${STORE_ORIGIN}/${'a'.repeat(2048)}?syclid=x`)).toBe(false);
  });
});
