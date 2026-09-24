import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { renewCustomerToken } = vi.hoisted(() => ({
  renewCustomerToken: vi.fn(),
}));

vi.mock('./lib/token-renewal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/token-renewal')>();

  return { ...actual, renewCustomerToken };
});

import config from './config';
import proxy from './proxy';

const TOKEN = config.cookies.shopifyToken;
const EXPIRE = config.cookies.shopifyTokenExpire;
const MARKER = config.cookies.sessionPresent;

const hourFromNow = () => new Date(Date.now() + 3_600_000).toISOString();
const hourAgo = () => new Date(Date.now() - 3_600_000).toISOString();

const request = (path: string, cookieHeader?: string) =>
  new NextRequest(`https://example.com${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });

const sessionCookies = (token: string, expiresAt: string, marker = true) =>
  [
    `${TOKEN}=${token}`,
    `${EXPIRE}=${encodeURIComponent(expiresAt)}`,
    ...(marker ? [`${MARKER}=1`] : []),
  ].join('; ');

describe('proxy', () => {
  beforeEach(() => {
    renewCustomerToken.mockReset();
    renewCustomerToken.mockResolvedValue(null);
  });

  it('lets anonymous catalog requests through without setting cookies', async () => {
    const response = await proxy(request('/collections/all'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(renewCustomerToken).not.toHaveBeenCalled();
    expect(response.cookies.get(TOKEN)).toBeUndefined();
    expect(response.cookies.get(MARKER)).toBeUndefined();
  });

  it('redirects signed-out visitors away from account routes', async () => {
    const response = await proxy(request('/account/orders'));

    expect(response.headers.get('location')).toBe('https://example.com/login');
    expect(renewCustomerToken).not.toHaveBeenCalled();
  });

  it('bounces signed-in visitors away from auth routes', async () => {
    renewCustomerToken.mockResolvedValue({ accessToken: 'new-1', expiresAt: hourFromNow() });

    const response = await proxy(request('/login', sessionCookies('token-1', hourFromNow())));

    expect(renewCustomerToken).toHaveBeenCalledWith('token-1');
    expect(response.headers.get('location')).toBe('https://example.com/account');
  });

  it('clears stale sessions on account routes when renewal fails', async () => {
    const response = await proxy(request('/account', sessionCookies('token-1', hourAgo())));

    expect(response.headers.get('location')).toBe('https://example.com/login');
    expect(response.cookies.get(TOKEN)?.value).toBe('');
    expect(response.cookies.get(EXPIRE)?.value).toBe('');
    expect(response.cookies.get(MARKER)?.value).toBe('');
  });

  it('stores the renewed token when renewal succeeds', async () => {
    renewCustomerToken.mockResolvedValue({ accessToken: 'new-1', expiresAt: hourFromNow() });

    // Expiry inside the renewal window forces validation even on catalog routes.
    const almostExpired = new Date(Date.now() + 60_000).toISOString();
    const response = await proxy(
      request('/collections/all', sessionCookies('token-1', almostExpired)),
    );

    expect(renewCustomerToken).toHaveBeenCalledWith('token-1');
    expect(response.cookies.get(TOKEN)?.value).toBe('new-1');
  });

  it('repairs the session marker without touching the token', async () => {
    const response = await proxy(
      request('/search', sessionCookies('token-1', hourFromNow(), false)),
    );

    // Fresh expiry on a catalog route: no validation round-trip needed.
    expect(renewCustomerToken).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBeNull();
    expect(response.cookies.get(MARKER)?.value).toBe('1');
    expect(response.cookies.get(TOKEN)).toBeUndefined();
  });
});
