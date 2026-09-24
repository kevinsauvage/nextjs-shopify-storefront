import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWishlistState, mutateWishlist, rateLimited, updateTag } = vi.hoisted(() => ({
  getWishlistState: vi.fn(),
  mutateWishlist: vi.fn(),
  rateLimited: vi.fn(async () => false),
  updateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), updateTag }));
vi.mock('@/lib/server/client-ip', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/client-ip')>();

  return { ...actual, getClientIp: async () => '1.2.3.4' };
});
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken: async () => 'token-9' }));
// Fully mocked: the real service pulls `@/shopify`, which throws without
// Storefront credentials at import time. ID shape is covered by
// `wishlist.service.test.ts`; here a faithful subset suffices.
vi.mock('@/services/wishlist.service', () => ({
  WISHLIST_MAX_ITEMS: 100,
  WISHLIST_TAG: 'wishlist',
  WishlistService: { getWishlistState, mutateWishlist },
  getWishlistIdsCached: vi.fn(async () => []),
  isValidWishlistProductId: (value: unknown): value is string =>
    typeof value === 'string' && /^gid:\/\/shopify\/Product\/\d+$/.test(value),
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

import { setWishlistMembershipAction } from './wishlistActions';

const PRODUCT_ID = 'gid://shopify/Product/123';
const OTHER_ID = 'gid://shopify/Product/456';
const CUSTOMER_ID = 'gid://shopify/Customer/1';

describe('setWishlistMembershipAction', () => {
  beforeEach(() => {
    getWishlistState.mockReset();
    mutateWishlist.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [] });
    mutateWishlist.mockResolvedValue({ success: true, data: [PRODUCT_ID] });
  });

  it('rejects a malformed product id without touching the limiter', async () => {
    const result = await setWishlistMembershipAction(false, 'not-a-gid');

    expect(result.success).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(mutateWishlist).not.toHaveBeenCalled();
  });

  it('fails closed with a session-scoped bucket when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(result.success).toBe(false);
    expect(mutateWishlist).not.toHaveBeenCalled();
    expect(rateLimited).toHaveBeenCalledWith(
      'wishlist:write',
      expect.stringMatching(/^1\.2\.3\.4:[0-9a-f]{16}$/),
      30,
      '1 m',
      { failClosed: true },
    );
  });

  it('rejects unauthenticated callers without mutating', async () => {
    getWishlistState.mockResolvedValue({ customerId: null, ids: [] });

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(result.success).toBe(false);
    expect(result.message).toBe('User not authenticated');
    expect(mutateWishlist).not.toHaveBeenCalled();
  });

  it('short-circuits adding a product that is already wishlisted', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [PRODUCT_ID] });

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(result).toEqual({
      success: true,
      data: [PRODUCT_ID],
      message: 'Product already in wishlist',
    });
    expect(mutateWishlist).not.toHaveBeenCalled();
  });

  it('short-circuits removing a product that is already absent', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [] });

    const result = await setWishlistMembershipAction(true, PRODUCT_ID);

    expect(result).toEqual({
      success: true,
      data: [],
      message: 'Product already removed from wishlist',
    });
    expect(mutateWishlist).not.toHaveBeenCalled();
  });

  it('adds a product through the service', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [OTHER_ID] });
    mutateWishlist.mockResolvedValue({ success: true, data: [OTHER_ID, PRODUCT_ID] });

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(mutateWishlist).toHaveBeenCalledWith(
      { action: 'add', productId: PRODUCT_ID },
      CUSTOMER_ID,
    );
    expect(result).toEqual({
      success: true,
      data: [OTHER_ID, PRODUCT_ID],
      message: 'Product added to wishlist',
    });
    expect(updateTag).toHaveBeenCalledWith('wishlist');
  });

  it('removes a product through the service', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [PRODUCT_ID, OTHER_ID] });
    mutateWishlist.mockResolvedValue({ success: true, data: [OTHER_ID] });

    const result = await setWishlistMembershipAction(true, PRODUCT_ID);

    expect(mutateWishlist).toHaveBeenCalledWith(
      { action: 'remove', productId: PRODUCT_ID },
      CUSTOMER_ID,
    );
    expect(result).toEqual({
      success: true,
      data: [OTHER_ID],
      message: 'Product removed from wishlist',
    });
    expect(updateTag).toHaveBeenCalledWith('wishlist');
  });

  it('forwards the service limit error when the wishlist is full', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [OTHER_ID] });
    mutateWishlist.mockResolvedValue({
      success: false,
      message: 'Wishlist is full. Maximum 100 items allowed.',
    });

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/full/);
    expect(updateTag).not.toHaveBeenCalled();
  });
});
