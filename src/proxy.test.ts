import { beforeEach, describe, expect, it, vi } from 'vitest';

const { renewCustomerToken, redirect, next, setCookie, deleteCookie } = vi.hoisted(() => ({
  deleteCookie: vi.fn(),
  next: vi.fn(),
  redirect: vi.fn(),
  renewCustomerToken: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock('@/lib/token-renewal', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  renewCustomerToken: (...args: unknown[]) => renewCustomerToken(...(args as [])),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    next: (...args: unknown[]) => {
      next(...args);
      return { cookies: { delete: deleteCookie, set: setCookie } };
    },
    redirect: (...args: unknown[]) => {
      redirect(...args);
      return { cookies: { delete: deleteCookie, set: setCookie } };
    },
  },
}));

import type { NextRequest } from 'next/server';

import config from '@/config';

import proxy from './proxy';

const TOKEN = 'shopify-token-1';
const TEST_ORIGIN = 'https://store.test';
const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const loginRedirectFrom = (pathname: string): URL =>
  new URL(config.routes.login, `${TEST_ORIGIN}${pathname}`);
const accountRedirectFrom = (pathname: string): URL =>
  new URL(config.routes.account, `${TEST_ORIGIN}${pathname}`);

const request = (pathname: string, cookies: Record<string, string> = {}): NextRequest =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    nextUrl: { pathname },
    url: `${TEST_ORIGIN}${pathname}`,
  }) as unknown as NextRequest;

const tokenCookies = (expiresAt: string = futureExpiry): Record<string, string> => ({
  [config.cookies.sessionPresent]: '1',
  [config.cookies.shopifyToken]: TOKEN,
  [config.cookies.shopifyTokenExpire]: expiresAt,
});

describe('proxy session gate', () => {
  beforeEach(() => {
    renewCustomerToken.mockReset();
    redirect.mockReset();
    next.mockReset();
    setCookie.mockReset();
    deleteCookie.mockReset();
  });

  it('lets an anonymous catalog request through without setting cookies', async () => {
    await proxy(request('/collections/sale'));

    expect(renewCustomerToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('validates account routes even outside the renewal window', async () => {
    renewCustomerToken.mockResolvedValue({ accessToken: 'new-token', expiresAt: futureExpiry });

    await proxy(request(config.routes.account, tokenCookies()));

    expect(renewCustomerToken).toHaveBeenCalledWith(TOKEN);
    expect(next).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('bounces a revoked token on an account route to login and clears cookies', async () => {
    // Shopify rejects the token (e.g. after logout elsewhere): no renewal.
    renewCustomerToken.mockResolvedValue(null);

    await proxy(request(config.routes.account, tokenCookies()));

    expect(redirect).toHaveBeenCalledWith(loginRedirectFrom(config.routes.account));
    expect(deleteCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.shopifyToken }),
    );
    expect(deleteCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.shopifyTokenExpire }),
    );
    expect(deleteCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.sessionPresent }),
    );
  });

  it('treats a missing expiry cookie on an account route as stale instead of immortal', async () => {
    renewCustomerToken.mockResolvedValue(null);
    const { [config.cookies.shopifyTokenExpire]: _dropped, ...withoutExpiry } = tokenCookies();

    await proxy(request(config.routes.account, withoutExpiry));

    expect(renewCustomerToken).toHaveBeenCalledWith(TOKEN);
    expect(redirect).toHaveBeenCalledWith(loginRedirectFrom(config.routes.account));
    expect(deleteCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.shopifyToken }),
    );
  });

  it('treats a malformed expiry cookie on an account route as stale', async () => {
    renewCustomerToken.mockResolvedValue(null);

    await proxy(request(config.routes.account, tokenCookies('not-a-date')));

    expect(renewCustomerToken).toHaveBeenCalledWith(TOKEN);
    expect(redirect).toHaveBeenCalledWith(loginRedirectFrom(config.routes.account));
  });

  it('bounces signed-in visitors away from auth routes', async () => {
    renewCustomerToken.mockResolvedValue({ accessToken: 'new-token', expiresAt: futureExpiry });

    await proxy(request(config.routes.login, tokenCookies()));

    expect(redirect).toHaveBeenCalledWith(accountRedirectFrom(config.routes.login));
  });

  it('redirects token-less account requests to login without a renewal round-trip', async () => {
    await proxy(request(config.routes.account));

    expect(renewCustomerToken).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(loginRedirectFrom(config.routes.account));
  });
});
