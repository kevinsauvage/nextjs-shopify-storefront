import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminSdk, getCustomer, getShopifyToken, metafieldsSet } = vi.hoisted(() => ({
  adminSdk: vi.fn(),
  getCustomer: vi.fn(),
  getShopifyToken: vi.fn(),
  metafieldsSet: vi.fn(),
}));

vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken }));
vi.mock('@/utils/api-responses', () => ({ safeLogError: vi.fn() }));
vi.mock('@/shopify', () => ({
  adminSdk: () => ({ MetafieldsSet: metafieldsSet }),
  storefrontSdk: () => ({ getCustomer, getProductsByIds: vi.fn() }),
}));

import { WishlistService } from './wishlist.service';

const CUSTOMER_ID = 'gid://shopify/Customer/1';

describe('WishlistService', () => {
  beforeEach(() => {
    adminSdk.mockReset();
    getCustomer.mockReset();
    getShopifyToken.mockReset();
    metafieldsSet.mockReset();
  });

  it('reads the ids and customer id in a single request', async () => {
    getShopifyToken.mockResolvedValue('token');
    getCustomer.mockResolvedValue({
      customer: { id: CUSTOMER_ID, metafields: [{ value: JSON.stringify(['a', 'b']) }] },
    });

    await expect(WishlistService.getWishlistState()).resolves.toEqual({
      customerId: CUSTOMER_ID,
      ids: ['a', 'b'],
    });
    expect(getCustomer).toHaveBeenCalledTimes(1);
  });

  it('returns an empty state when there is no session', async () => {
    getShopifyToken.mockResolvedValue(undefined);

    await expect(WishlistService.getWishlistState()).resolves.toEqual({
      customerId: null,
      ids: [],
    });
    expect(getCustomer).not.toHaveBeenCalled();
  });

  it('tolerates a malformed metafield value', async () => {
    getShopifyToken.mockResolvedValue('token');
    getCustomer.mockResolvedValue({
      customer: { id: CUSTOMER_ID, metafields: [{ value: 'not-json' }] },
    });

    await expect(WishlistService.getWishlistIds()).resolves.toEqual([]);
  });

  it('persists the wishlist in a single deduplicated write', async () => {
    metafieldsSet.mockResolvedValue({ metafieldsSet: { userErrors: [] } });

    await expect(
      WishlistService.updateWishlist(['a', 'a', 'b'], CUSTOMER_ID),
    ).resolves.toEqual({ success: true, data: ['a', 'b'] });
    expect(metafieldsSet).toHaveBeenCalledTimes(1);
  });

  it('fails gracefully when the Admin API is not configured', async () => {
    metafieldsSet.mockRejectedValue(new Error('Shopify Admin API is not configured'));

    const result = await WishlistService.updateWishlist(['a'], CUSTOMER_ID);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Admin API/);
  });
});
