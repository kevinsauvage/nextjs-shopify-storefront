import { beforeEach, describe, expect, it, vi } from 'vitest';

const { customerUpdate, getShopifyToken, newsletterSubscribe, setShopifyToken } = vi.hoisted(
  () => ({
    customerUpdate: vi.fn(),
    getShopifyToken: vi.fn(),
    newsletterSubscribe: vi.fn(),
    setShopifyToken: vi.fn(),
  }),
);

vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken, setShopifyToken }));
vi.mock('@/shopify', () => ({
  adminSdk: () => ({ NewsletterSubscribe: newsletterSubscribe }),
  storefrontSdk: () => ({ customerUpdate }),
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

import { UserService } from './user.service';

const INPUT = {
  email: 'a@b.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

const CUSTOMER_TOKEN = {
  accessToken: 'new-token',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

describe('UserService.updateUser', () => {
  beforeEach(() => {
    customerUpdate.mockReset();
    getShopifyToken.mockReset();
    setShopifyToken.mockReset();
    getShopifyToken.mockResolvedValue('token-1');
  });

  it('returns an error without calling Shopify when logged out', async () => {
    getShopifyToken.mockResolvedValue(undefined);

    await expect(UserService.updateUser(INPUT)).resolves.toEqual({
      error: 'User not logged in',
    });
    expect(customerUpdate).not.toHaveBeenCalled();
  });

  it('surfaces Shopify customer errors', async () => {
    customerUpdate.mockResolvedValue({
      customerUpdate: { customer: null, customerUserErrors: [{ message: 'Invalid email' }] },
    });

    await expect(UserService.updateUser(INPUT)).resolves.toEqual({
      customerUserErrors: [{ message: 'Invalid email' }],
    });
    expect(setShopifyToken).not.toHaveBeenCalled();
  });

  it('returns the updated customer on success', async () => {
    const customer = { id: 'gid://shopify/Customer/1' };
    customerUpdate.mockResolvedValue({ customerUpdate: { customer, customerUserErrors: [] } });

    await expect(UserService.updateUser(INPUT)).resolves.toEqual({
      customer,
      success: 'User updated successfully',
    });
    expect(customerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ customerAccessToken: 'token-1' }),
    );
  });

  it('stores the rotated token when Shopify issues one', async () => {
    customerUpdate.mockResolvedValue({
      customerUpdate: {
        customer: { id: 'gid://shopify/Customer/1' },
        customerAccessToken: CUSTOMER_TOKEN,
        customerUserErrors: [],
      },
    });

    await expect(UserService.updateUser(INPUT)).resolves.toMatchObject({
      success: expect.any(String),
    });
    expect(setShopifyToken).toHaveBeenCalledWith(CUSTOMER_TOKEN);
  });

  it('returns an error when Shopify updates nothing', async () => {
    customerUpdate.mockResolvedValue({
      customerUpdate: { customer: null, customerUserErrors: [] },
    });

    await expect(UserService.updateUser(INPUT)).resolves.toEqual({
      error: 'Failed to update user',
    });
  });

  it('returns an error when the mutation payload is missing', async () => {
    customerUpdate.mockResolvedValue({});

    await expect(UserService.updateUser(INPUT)).resolves.toEqual({
      error: 'Failed to update user',
    });
    expect(setShopifyToken).not.toHaveBeenCalled();
  });

  it('maps phone to undefined when blank and keeps marketing opt-in', async () => {
    const customer = { id: 'gid://shopify/Customer/1' };
    customerUpdate.mockResolvedValue({ customerUpdate: { customer, customerUserErrors: [] } });

    await expect(
      UserService.updateUser({ ...INPUT, acceptsMarketing: 'true', phone: '' }),
    ).resolves.toMatchObject({ success: expect.any(String) });
    expect(customerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: expect.objectContaining({ acceptsMarketing: true, phone: undefined }),
      }),
    );
  });

  it('maps acceptsMarketing=false (and an absent flag) to opt-out', async () => {
    const customer = { id: 'gid://shopify/Customer/1' };
    customerUpdate.mockResolvedValue({ customerUpdate: { customer, customerUserErrors: [] } });

    await UserService.updateUser({ ...INPUT, acceptsMarketing: 'false' });
    expect(customerUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ customer: expect.objectContaining({ acceptsMarketing: false }) }),
    );

    const withoutFlag = {
      email: INPUT.email,
      firstName: INPUT.firstName,
      lastName: INPUT.lastName,
    };
    await UserService.updateUser(withoutFlag);
    expect(customerUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ customer: expect.objectContaining({ acceptsMarketing: false }) }),
    );
  });
});

describe('UserService.subscribeNewsletter', () => {
  beforeEach(() => {
    newsletterSubscribe.mockReset();
  });

  it('creates a subscribed customer through the Admin API', async () => {
    newsletterSubscribe.mockResolvedValue({
      customerCreate: {
        customer: { id: 'gid://shopify/Customer/2', email: 'a@b.com' },
        userErrors: [],
      },
    });

    await expect(UserService.subscribeNewsletter({ email: 'a@b.com' })).resolves.toEqual({
      success: true,
    });
    expect(newsletterSubscribe).toHaveBeenCalledWith({
      input: {
        email: 'a@b.com',
        emailMarketingConsent: {
          marketingOptInLevel: 'SINGLE_OPT_IN',
          marketingState: 'SUBSCRIBED',
        },
      },
    });
  });

  it('treats an already-registered email as success without leaking it', async () => {
    newsletterSubscribe.mockResolvedValue({
      customerCreate: {
        customer: null,
        userErrors: [{ field: ['email'], message: 'Email has already been taken' }],
      },
    });

    await expect(UserService.subscribeNewsletter({ email: 'a@b.com' })).resolves.toEqual({
      success: true,
    });
  });

  it('bubbles genuine validation errors for the action to render', async () => {
    const userErrors = [{ field: ['email'], message: 'Email is invalid' }];
    newsletterSubscribe.mockResolvedValue({
      customerCreate: { customer: null, userErrors },
    });

    await expect(UserService.subscribeNewsletter({ email: 'a@b.com' })).resolves.toEqual({
      userErrors,
    });
  });

  it('returns a generic error when the Admin API is unreachable', async () => {
    newsletterSubscribe.mockRejectedValue(new Error('network down'));

    await expect(UserService.subscribeNewsletter({ email: 'a@b.com' })).resolves.toEqual({
      error: 'Failed to subscribe',
    });
  });
});
