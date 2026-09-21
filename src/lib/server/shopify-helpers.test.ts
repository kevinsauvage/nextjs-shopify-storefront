import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieGet, cookieSet, cookieDelete } = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ delete: cookieDelete, get: cookieGet, set: cookieSet }),
}));

import config from '@/config';
import { shouldRenewToken } from '@/lib/token-renewal';

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
  });

  it('returns undefined when there is no token cookie', async () => {
    cookieGet.mockReturnValue(undefined);
    await expect(getShopifyToken()).resolves.toBeUndefined();
  });

  it('returns the stored token without mutating cookies', async () => {
    mockTokens('token-1', new Date(Date.now() + HOUR_MS).toISOString());

    await expect(getShopifyToken()).resolves.toBe('token-1');
    expect(cookieSet).not.toHaveBeenCalled();
    expect(cookieDelete).not.toHaveBeenCalled();
  });

  it('returns the stored token even when it is expiring (renewal moved to proxy)', async () => {
    mockTokens('token-1', new Date(Date.now() - HOUR_MS).toISOString());

    await expect(getShopifyToken()).resolves.toBe('token-1');
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it('reports session presence from the token cookie', async () => {
    cookieGet.mockReturnValue({ value: 'token-1' });
    await expect(hasShopifySession()).resolves.toBe(true);

    cookieGet.mockReturnValue(undefined);
    await expect(hasShopifySession()).resolves.toBe(false);
  });
});

describe('shouldRenewToken', () => {
  it('does not renew a missing or invalid expiry', () => {
    expect(shouldRenewToken(undefined)).toBe(false);
    expect(shouldRenewToken(null)).toBe(false);
    expect(shouldRenewToken('not-a-date')).toBe(false);
  });

  it('renews only when the token is close to expiring', () => {
    expect(shouldRenewToken(new Date(Date.now() + HOUR_MS).toISOString())).toBe(false);
    expect(shouldRenewToken(new Date(Date.now() + 60_000).toISOString())).toBe(true);
    expect(shouldRenewToken(new Date(Date.now() - HOUR_MS).toISOString())).toBe(true);
  });
});
