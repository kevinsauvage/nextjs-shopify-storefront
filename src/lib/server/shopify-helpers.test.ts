import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieGet, cookieSet, cookieDelete, renew } = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  renew: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ delete: cookieDelete, get: cookieGet, set: cookieSet }),
}));

vi.mock('@/shopify', () => ({
  storefrontSdk: () => ({ customerAccessTokenRenew: renew }),
}));

vi.mock('@/utils/api-responses', () => ({ safeLogError: vi.fn() }));

import config from '@/config';

import { getShopifyToken, hasShopifySession } from './shopify-helpers';

const HOUR_MS = 60 * 60 * 1000;

const mockTokens = (token: string, expiresAt: string) => {
  cookieGet.mockImplementation((name: string) => {
    if (name === config.cookies.shopifyToken) return { value: token };
    if (name === config.cookies.shopifyTokenExpire) return { value: expiresAt };
    return undefined;
  });
};

describe('shopify-helpers', () => {
  beforeEach(() => {
    cookieGet.mockReset();
    cookieSet.mockReset();
    cookieDelete.mockReset();
    renew.mockReset();
  });

  it('returns undefined when there is no token cookie', async () => {
    cookieGet.mockReturnValue(undefined);
    await expect(getShopifyToken()).resolves.toBeUndefined();
  });

  it('returns the stored token when it is not expiring', async () => {
    mockTokens('token-1', new Date(Date.now() + HOUR_MS).toISOString());

    await expect(getShopifyToken()).resolves.toBe('token-1');
    expect(renew).not.toHaveBeenCalled();
  });

  it('renews and returns a fresh token when the stored one is expiring', async () => {
    mockTokens('token-1', new Date(Date.now() - HOUR_MS).toISOString());
    renew.mockResolvedValue({
      customerAccessTokenRenew: {
        customerAccessToken: {
          accessToken: 'token-2',
          expiresAt: new Date(Date.now() + HOUR_MS).toISOString(),
        },
        userErrors: [],
      },
    });

    await expect(getShopifyToken()).resolves.toBe('token-2');
    expect(renew).toHaveBeenCalledWith({ customerAccessToken: 'token-1' });
  });

  it('reports session presence from the token cookie', async () => {
    cookieGet.mockReturnValue({ value: 'token-1' });
    await expect(hasShopifySession()).resolves.toBe(true);

    cookieGet.mockReturnValue(undefined);
    await expect(hasShopifySession()).resolves.toBe(false);
  });
});
