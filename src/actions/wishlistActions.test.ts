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
vi.mock('@/utils/api-responses', () => ({ safeLogError: vi.fn() }));

import { addToWishlistAction } from './wishlistActions';

const PRODUCT_ID = 'gid://shopify/Product/123';

describe('addToWishlistAction', () => {
  beforeEach(() => {
    getWishlistState.mockReset();
    mutateWishlist.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
  });

  it('rejects a malformed product id without touching the limiter', async () => {
    const result = await addToWishlistAction('not-a-gid');

    expect(result.success).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(mutateWishlist).not.toHaveBeenCalled();
  });

  it('fails closed with a session-scoped bucket when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const result = await addToWishlistAction(PRODUCT_ID);

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
});
