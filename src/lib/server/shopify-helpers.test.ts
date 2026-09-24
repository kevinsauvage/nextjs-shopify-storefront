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

import { clearShopifyToken, getShopifyToken, setShopifyToken } from './shopify-helpers';

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

  it('clears both token cookies with delete options (survives a Domain cookie)', async () => {
    await clearShopifyToken();

    expect(cookieDelete).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.shopifyToken, path: '/' }),
    );
    expect(cookieDelete).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.shopifyTokenExpire, path: '/' }),
    );
  });

  it('stores the token, expiry and session marker on success', async () => {
    const expiresAt = new Date(Date.now() + HOUR_MS).toISOString();

    await setShopifyToken({ accessToken: 'token-1', expiresAt });

    expect(cookieSet).toHaveBeenCalledTimes(3);
    expect(cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.shopifyToken, value: 'token-1' }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: config.cookies.shopifyTokenExpire,
        value: expiresAt,
      }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.sessionPresent, value: '1' }),
    );
  });

  it('ignores missing or partial tokens without touching cookies', async () => {
    await setShopifyToken(undefined as never);
    await setShopifyToken({ accessToken: '', expiresAt: '' } as never);

    expect(cookieSet).not.toHaveBeenCalled();
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
