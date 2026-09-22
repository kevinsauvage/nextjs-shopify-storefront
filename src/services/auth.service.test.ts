import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCartId, getUser, sdk, setShopifyToken } = vi.hoisted(() => ({
  getCartId: vi.fn(),
  getUser: vi.fn(),
  sdk: {
    cartBuyerIdentityUpdate: vi.fn(),
    customerAccessTokenCreate: vi.fn(),
    customerCreate: vi.fn(),
    customerRecover: vi.fn(),
    customerResetByUrl: vi.fn(),
  },
  setShopifyToken: vi.fn(),
}));

vi.mock('@/shopify', () => ({ storefrontSdk: () => sdk }));
vi.mock('@/shopify/helpers', () => ({
  adjustPaginationVariables: (variables: Record<string, unknown>) => variables,
}));
vi.mock('@/lib/server/shopify-helpers', () => ({ setShopifyToken }));
vi.mock('@/utils/users', () => ({ getUser }));
vi.mock('@/utils/api-responses', () => ({ safeLogError: vi.fn() }));
vi.mock('@/services/cart.service', () => ({
  CartService: { getCartId },
}));

import { AuthService } from './auth.service';

const CUSTOMER_TOKEN = {
  accessToken: 'access-token',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

describe('AuthService', () => {
  beforeEach(() => {
    Object.values(sdk).forEach((mock) => mock.mockReset());
    getCartId.mockReset();
    getUser.mockReset();
    setShopifyToken.mockReset();
    getCartId.mockResolvedValue(null);
    getUser.mockResolvedValue(undefined);
  });

  describe('login', () => {
    it('surfaces Shopify customer errors without storing a token', async () => {
      sdk.customerAccessTokenCreate.mockResolvedValue({
        customerAccessTokenCreate: {
          customerAccessToken: null,
          customerUserErrors: [{ message: 'Unidentified customer' }],
        },
      });

      await expect(AuthService.login({ email: 'a@b.com', password: 'secret1' })).resolves.toEqual({
        customerUserErrors: [{ message: 'Unidentified customer' }],
      });
      expect(setShopifyToken).not.toHaveBeenCalled();
    });

    it('returns an error when no token is issued', async () => {
      sdk.customerAccessTokenCreate.mockResolvedValue({
        customerAccessTokenCreate: { customerAccessToken: null, customerUserErrors: [] },
      });

      await expect(AuthService.login({ email: 'a@b.com', password: 'secret1' })).resolves.toEqual({
        error: 'Invalid email or password',
      });
    });

    it('stores the token on success', async () => {
      sdk.customerAccessTokenCreate.mockResolvedValue({
        customerAccessTokenCreate: { customerAccessToken: CUSTOMER_TOKEN, customerUserErrors: [] },
      });

      await expect(AuthService.login({ email: 'a@b.com', password: 'secret1' })).resolves.toEqual({
        success: true,
        customerAccessToken: CUSTOMER_TOKEN,
      });
      expect(setShopifyToken).toHaveBeenCalledWith(CUSTOMER_TOKEN);
    });
  });

  describe('register', () => {
    it('surfaces customer creation errors', async () => {
      sdk.customerCreate.mockResolvedValue({
        customerCreate: {
          customer: null,
          customerUserErrors: [{ message: 'Email has already been taken' }],
          userErrors: [],
        },
      });

      await expect(
        AuthService.register({
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
          password: 'secret1',
        }),
      ).resolves.toEqual({ customerUserErrors: [{ message: 'Email has already been taken' }] });
      expect(sdk.customerAccessTokenCreate).not.toHaveBeenCalled();
    });
  });

  describe('recoverPassword', () => {
    it('surfaces customer errors', async () => {
      sdk.customerRecover.mockResolvedValue({
        customerRecover: { customerUserErrors: [{ message: 'No account found' }] },
      });

      await expect(AuthService.recoverPassword({ email: 'a@b.com' })).resolves.toEqual({
        customerUserErrors: [{ message: 'No account found' }],
      });
    });

    it('succeeds when Shopify accepts the request', async () => {
      sdk.customerRecover.mockResolvedValue({ customerRecover: { customerUserErrors: [] } });

      await expect(AuthService.recoverPassword({ email: 'a@b.com' })).resolves.toEqual({
        success: true,
      });
    });
  });

  describe('resetPassword', () => {
    it('returns an error when Shopify issues no token', async () => {
      sdk.customerResetByUrl.mockResolvedValue({
        customerResetByUrl: { customerAccessToken: null, customerUserErrors: [] },
      });

      await expect(
        AuthService.resetPassword({ password: 'secret1', resetToken: 'reset-url' }),
      ).resolves.toEqual({ error: 'Failed to reset password' });
    });
  });
});
