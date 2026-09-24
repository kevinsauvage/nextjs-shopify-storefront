import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  clearShopifyToken,
  customerAccessTokenDelete,
  getShopifyToken,
  login,
  rateLimited,
  recover,
  redirect,
  register,
  resetPassword,
} = vi.hoisted(() => ({
  clearShopifyToken: vi.fn(),
  customerAccessTokenDelete: vi.fn(),
  getShopifyToken: vi.fn(),
  login: vi.fn(),
  rateLimited: vi.fn(async () => false),
  recover: vi.fn(),
  redirect: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/server/client-ip', () => ({ getClientIp: async () => '1.2.3.4' }));
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/server/shopify-helpers', () => ({ clearShopifyToken, getShopifyToken }));
vi.mock('@/services/auth.service', () => ({
  AuthService: { login, recoverPassword: recover, register, resetPassword },
}));
vi.mock('@/shopify', () => ({
  storefrontSdk: () => ({ customerAccessTokenDelete }),
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

import config from '@/config';
import { userFeedback } from '@/data/userFeedback';

import {
  loginAction,
  logoutAction,
  recoverPasswordAction,
  registerAction,
  resetPasswordAction,
} from './authActions';

const CREDENTIALS = { email: 'a@b.com', password: 'secret1' };
const TOO_MANY_MESSAGE = 'Too many attempts. Please try again in a few minutes.';

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

  it('rejects oversized passwords instead of hashing them against Shopify', async () => {
    const state = await loginAction({ email: 'a@b.com', password: 'p'.repeat(129) });

    expect(state.ok).toBe(false);
    expect(login).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('normalizes the email before the service call', async () => {
    login.mockResolvedValue({ success: true });

    await loginAction({ email: '  A@B.com  ', password: 'secret1' });

    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com', password: 'secret1' }),
    );
  });

  it('login fails closed with a generic message when the limiter trips', async () => {
    rateLimited.mockResolvedValue(true);

    const state = await loginAction(CREDENTIALS);

    expect(state).toMatchObject({ message: TOO_MANY_MESSAGE, ok: false });
    expect(login).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('registerAction', () => {
  const INPUT = {
    email: 'a@b.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    password: 'secret1',
    passwordConfirm: 'secret1',
  };

  beforeEach(() => {
    register.mockReset();
    redirect.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('registers without leaking the confirmation, then redirects to account', async () => {
    register.mockResolvedValue({ success: true });

    await registerAction(INPUT);

    expect(register).toHaveBeenCalledWith({
      email: 'a@b.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'secret1',
    });
    expect(redirect).toHaveBeenCalledWith(config.routes.account);
  });

  it('rejects a mismatched confirmation without calling the service', async () => {
    const state = await registerAction({ ...INPUT, passwordConfirm: 'different' });

    expect(state.ok).toBe(false);
    expect(register).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('register fails closed with a generic message when the limiter trips', async () => {
    rateLimited.mockResolvedValue(true);

    const state = await registerAction(INPUT);

    expect(state).toMatchObject({ message: TOO_MANY_MESSAGE, ok: false });
    expect(register).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns the service error and does not redirect when registration fails', async () => {
    register.mockResolvedValue({
      customerUserErrors: [{ message: 'Email has already been taken' }],
    });

    const state = await registerAction(INPUT);

    expect(state).toMatchObject({ message: 'Email has already been taken', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('recoverPasswordAction', () => {
  beforeEach(() => {
    recover.mockReset();
    redirect.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('returns the success message when Shopify accepts the request', async () => {
    recover.mockResolvedValue({ success: true });

    const state = await recoverPasswordAction({ email: 'a@b.com' });

    expect(recover).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(state).toEqual({ message: userFeedback.sendRecoverEmail.success, ok: true });
  });

  it('recover fails closed with a generic message when the limiter trips', async () => {
    rateLimited.mockResolvedValue(true);

    const state = await recoverPasswordAction({ email: 'a@b.com' });

    expect(state).toMatchObject({ message: TOO_MANY_MESSAGE, ok: false });
    expect(recover).not.toHaveBeenCalled();
  });

  it('rejects malformed input without calling the service', async () => {
    const state = await recoverPasswordAction({ email: 'not-an-email' });

    expect(state.ok).toBe(false);
    expect(recover).not.toHaveBeenCalled();
  });

  it('returns the service error when recovery fails', async () => {
    recover.mockResolvedValue({ error: 'No account found' });

    const state = await recoverPasswordAction({ email: 'a@b.com' });

    expect(state).toMatchObject({ message: 'No account found', ok: false });
  });
});

describe('resetPasswordAction', () => {
  const NEW_PASSWORD = 'new-password-1';
  const RESET_URL = 'https://ecomfashionstore.myshopify.com/account/reset/abc?syclid=token-1';

  beforeEach(() => {
    resetPassword.mockReset();
    redirect.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('forwards a store-owned reset link to the service and redirects to account', async () => {
    resetPassword.mockResolvedValue({ success: true });

    await resetPasswordAction({ password: NEW_PASSWORD, resetUrl: RESET_URL });

    expect(resetPassword).toHaveBeenCalledWith({
      password: NEW_PASSWORD,
      resetToken: RESET_URL,
    });
    expect(redirect).toHaveBeenCalledWith(config.routes.account);
  });

  it('rejects an off-store reset URL without calling the service', async () => {
    const state = await resetPasswordAction({
      password: NEW_PASSWORD,
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

    const state = await resetPasswordAction({ password: NEW_PASSWORD, resetUrl: RESET_URL });

    expect(state.ok).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('reset fails closed with a generic message when the limiter trips', async () => {
    rateLimited.mockResolvedValue(true);

    const state = await resetPasswordAction({ password: NEW_PASSWORD, resetUrl: RESET_URL });

    expect(state).toMatchObject({ message: TOO_MANY_MESSAGE, ok: false });
    expect(resetPassword).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('logoutAction', () => {
  beforeEach(() => {
    clearShopifyToken.mockReset();
    customerAccessTokenDelete.mockReset();
    getShopifyToken.mockReset();
    redirect.mockReset();
  });

  it('clears the session cookies, revokes the token and redirects to login', async () => {
    getShopifyToken.mockResolvedValue('token-1');

    await logoutAction();

    expect(clearShopifyToken).toHaveBeenCalledTimes(1);
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
