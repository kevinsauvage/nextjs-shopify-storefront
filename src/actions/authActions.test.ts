import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  clearShopifyToken,
  cookieDelete,
  customerAccessTokenDelete,
  getShopifyToken,
  login,
  rateLimited,
  redirect,
  resetPassword,
} = vi.hoisted(() => ({
  clearShopifyToken: vi.fn(),
  cookieDelete: vi.fn(),
  customerAccessTokenDelete: vi.fn(),
  getShopifyToken: vi.fn(),
  login: vi.fn(),
  rateLimited: vi.fn(async () => false),
  redirect: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ delete: cookieDelete }),
}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/server/client-ip', () => ({ getClientIp: async () => '1.2.3.4' }));
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/server/shopify-helpers', () => ({ clearShopifyToken, getShopifyToken }));
vi.mock('@/services/auth.service', () => ({ AuthService: { login, resetPassword } }));
vi.mock('@/shopify', () => ({
  storefrontSdk: () => ({ customerAccessTokenDelete }),
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

import config from '@/config';

import { loginAction, logoutAction, resetPasswordAction } from './authActions';

const CREDENTIALS = { email: 'a@b.com', password: 'secret1' };

describe('loginAction', () => {
  beforeEach(() => {
    login.mockReset();
    redirect.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('rejects an open-redirect from the query string and falls back to the account page', async () => {
    login.mockResolvedValue({ success: true });

    await loginAction({ ...CREDENTIALS, redirectUrl: 'https://evil.com/phish' });

    expect(redirect).toHaveBeenCalledWith(config.routes.account);
  });

  it('rejects protocol-relative and backslash redirects', async () => {
    login.mockResolvedValue({ success: true });

    await loginAction({ ...CREDENTIALS, redirectUrl: '//evil.com' });
    expect(redirect).toHaveBeenLastCalledWith(config.routes.account);

    await loginAction({ ...CREDENTIALS, redirectUrl: '/\\evil.com' });
    expect(redirect).toHaveBeenLastCalledWith(config.routes.account);
  });

  it('honours a same-origin redirect target', async () => {
    login.mockResolvedValue({ success: true });

    await loginAction({ ...CREDENTIALS, redirectUrl: '/account/orders?after=1' });

    expect(redirect).toHaveBeenCalledWith('/account/orders?after=1');
  });

  it('returns the service error and does not redirect when login fails', async () => {
    login.mockResolvedValue({ error: 'Invalid email or password' });

    const state = await loginAction(CREDENTIALS);

    expect(state).toMatchObject({ ok: false, message: 'Invalid email or password' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('fails validation for malformed input without calling the service', async () => {
    const state = await loginAction({ email: 'not-an-email', password: 'secret1' });

    expect(state.ok).toBe(false);
    expect(login).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('resetPasswordAction', () => {
  const RESET_URL = 'https://ecomfashionstore.myshopify.com/account/reset/abc?syclid=token-1';

  beforeEach(() => {
    resetPassword.mockReset();
    redirect.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('forwards a store-owned reset link to the service and redirects to account', async () => {
    resetPassword.mockResolvedValue({ success: true });

    await resetPasswordAction({ password: 'new-password-1', resetUrl: RESET_URL });

    expect(resetPassword).toHaveBeenCalledWith({
      password: 'new-password-1',
      resetToken: RESET_URL,
    });
    expect(redirect).toHaveBeenCalledWith(config.routes.account);
  });

  it('rejects an off-store reset URL without calling the service', async () => {
    const state = await resetPasswordAction({
      password: 'new-password-1',
      resetUrl: 'https://evil.com/reset?syclid=token-1',
    });

    expect(state.ok).toBe(false);
    expect(resetPassword).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('rejects oversized passwords instead of hashing them against Shopify', async () => {
    const state = await resetPasswordAction({ password: 'p'.repeat(129), resetUrl: RESET_URL });

    expect(state.ok).toBe(false);
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('returns the service error and does not redirect when reset fails', async () => {
    resetPassword.mockResolvedValue({ error: 'Unable to reset password. Please try again.' });

    const state = await resetPasswordAction({ password: 'new-password-1', resetUrl: RESET_URL });

    expect(state.ok).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('logoutAction', () => {
  beforeEach(() => {
    clearShopifyToken.mockReset();
    cookieDelete.mockReset();
    customerAccessTokenDelete.mockReset();
    getShopifyToken.mockReset();
    redirect.mockReset();
  });

  it('clears the session cookies, revokes the token and redirects to login', async () => {
    getShopifyToken.mockResolvedValue('token-1');

    await logoutAction();

    expect(clearShopifyToken).toHaveBeenCalledTimes(1);
    expect(cookieDelete).toHaveBeenCalledWith(
      expect.objectContaining({ name: config.cookies.delegateToken, path: '/' }),
    );
    expect(customerAccessTokenDelete).toHaveBeenCalledWith({ customerAccessToken: 'token-1' });
    expect(redirect).toHaveBeenCalledWith(config.routes.login);
  });

  it('still clears local cookies and redirects when there is no token', async () => {
    getShopifyToken.mockResolvedValue(undefined);

    await logoutAction();

    expect(clearShopifyToken).toHaveBeenCalledTimes(1);
    expect(customerAccessTokenDelete).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(config.routes.login);
  });

  it('logs out even when token revocation fails', async () => {
    getShopifyToken.mockResolvedValue('token-1');
    customerAccessTokenDelete.mockRejectedValue(new Error('network down'));

    await logoutAction();

    expect(clearShopifyToken).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(config.routes.login);
  });
});
