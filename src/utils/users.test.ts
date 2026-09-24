import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCustomer, getShopifyToken, reportError } = vi.hoisted(() => ({
  getCustomer: vi.fn(),
  getShopifyToken: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken }));
vi.mock('@/shopify', () => ({ storefrontSdk: () => ({ getCustomer }) }));
vi.mock('@/lib/logger', () => ({ reportError }));

import { getUser } from './users';

describe('getUser', () => {
  beforeEach(() => {
    getCustomer.mockReset();
    getShopifyToken.mockReset();
    reportError.mockReset();
  });

  it('returns null without calling Shopify when there is no token', async () => {
    getShopifyToken.mockResolvedValue(undefined);

    await expect(getUser()).resolves.toBeNull();
    expect(getCustomer).not.toHaveBeenCalled();
  });

  it('returns the customer for a valid token', async () => {
    const customer = { id: 'gid://shopify/Customer/1' };
    getShopifyToken.mockResolvedValue('token-1');
    getCustomer.mockResolvedValue({ customer });

    await expect(getUser()).resolves.toEqual(customer);
    expect(getCustomer).toHaveBeenCalledWith({ customerAccessToken: 'token-1', metafields: [] });
  });

  it('returns null when Shopify has no customer for the token', async () => {
    getShopifyToken.mockResolvedValue('stale-token');
    getCustomer.mockResolvedValue({ customer: null });

    await expect(getUser()).resolves.toBeNull();
  });

  it('returns null and reports when Shopify throws', async () => {
    getShopifyToken.mockResolvedValue('token-1');
    getCustomer.mockRejectedValue(new Error('network down'));

    await expect(getUser()).resolves.toBeNull();
    expect(reportError).toHaveBeenCalledWith('getUser', expect.any(Error));
  });
});
