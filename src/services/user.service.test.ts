import { beforeEach, describe, expect, it, vi } from 'vitest';

const { customerUpdate, getShopifyToken, setShopifyToken } = vi.hoisted(() => ({
  customerUpdate: vi.fn(),
  getShopifyToken: vi.fn(),
  setShopifyToken: vi.fn(),
}));

vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken, setShopifyToken }));
vi.mock('@/shopify', () => ({ storefrontSdk: () => ({ customerUpdate }) }));
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
});
