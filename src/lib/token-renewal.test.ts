import { isTokenExpired, renewCustomerToken, shouldRenewToken } from './token-renewal';

import { afterEach, describe, expect, it, vi } from 'vitest';

const HOUR_MS = 60 * 60 * 1000;
const isoFromNow = (ms: number): string => new Date(Date.now() + ms).toISOString();

describe('shouldRenewToken', () => {
  it('does not renew a missing or invalid expiry', () => {
    expect(shouldRenewToken(undefined)).toBe(false);
    expect(shouldRenewToken(null)).toBe(false);
    expect(shouldRenewToken('')).toBe(false);
    expect(shouldRenewToken('not-a-date')).toBe(false);
  });

  it('does not renew a fresh token', () => {
    expect(shouldRenewToken(isoFromNow(HOUR_MS))).toBe(false);
  });

  it('renews an expired token and one inside the renewal window', () => {
    expect(shouldRenewToken(isoFromNow(-HOUR_MS))).toBe(true);
    // 1 minute out is inside the 5-minute renewal window.
    expect(shouldRenewToken(isoFromNow(60 * 1000))).toBe(true);
  });
});

describe('isTokenExpired', () => {
  it('is false for missing, invalid or fresh expiries', () => {
    expect(isTokenExpired(undefined)).toBe(false);
    expect(isTokenExpired('not-a-date')).toBe(false);
    expect(isTokenExpired(isoFromNow(HOUR_MS))).toBe(false);
  });

  it('ignores the renewal window: only the past counts as expired', () => {
    expect(isTokenExpired(isoFromNow(60 * 1000))).toBe(false);
    expect(isTokenExpired(isoFromNow(-1000))).toBe(true);
  });
});

describe('renewCustomerToken', () => {
  const STOREFRONT_URL = 'https://store.myshopify.com/api/2026-07/graphql.json';

  const stubStorefrontEnv = () => {
    vi.stubEnv('NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL', STOREFRONT_URL);
    vi.stubEnv('SHOPIFY_STORE_FRONT_ACCESS_TOKEN', 'storefront-token');
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns null without calling Shopify when env is missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(renewCustomerToken('customer-token')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the renewed token on success', async () => {
    stubStorefrontEnv();
    const renewed = { accessToken: 'new-token', expiresAt: isoFromNow(HOUR_MS) };
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        data: { customerAccessTokenRenew: { customerAccessToken: renewed } },
      }),
      ok: true,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renewCustomerToken('old-token')).resolves.toEqual(renewed);
    expect(fetchMock).toHaveBeenCalledWith(
      STOREFRONT_URL,
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          'X-Shopify-Storefront-Access-Token': 'storefront-token',
        }),
        method: 'POST',
      }),
    );
  });

  it('returns null on non-ok responses', async () => {
    stubStorefrontEnv();
    const fetchMock = vi.fn(async () => ({ json: async () => ({}), ok: false }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renewCustomerToken('old-token')).resolves.toBeNull();
  });

  it('returns null when Shopify issues no token', async () => {
    stubStorefrontEnv();
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        data: { customerAccessTokenRenew: { customerAccessToken: null } },
      }),
      ok: true,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(renewCustomerToken('old-token')).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    stubStorefrontEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    await expect(renewCustomerToken('old-token')).resolves.toBeNull();
  });
});
