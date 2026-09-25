import type * as ClientIpModule from '@/lib/server/client-ip';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addLines,
  getWishlistIdsCached,
  getWishlistState,
  getShopifyTokenValue,
  mergeWishlist,
  mutateWishlist,
  rateLimited,
  removeFromWishlist,
  resolveMoveToCart,
  resolveProductsByIds,
  updateTag,
} = vi.hoisted(() => ({
  addLines: vi.fn(),
  getWishlistIdsCached: vi.fn(async (): Promise<string[]> => []),
  getWishlistState: vi.fn(),
  getShopifyTokenValue: { current: 'token-9' as string | null },
  mergeWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
  resolveMoveToCart: vi.fn(),
  mutateWishlist: vi.fn(),
  rateLimited: vi.fn(async () => false),
  resolveProductsByIds: vi.fn(async () => []),
  updateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), updateTag }));
vi.mock('@/lib/server/client-ip', async (importOriginal) => {
  const actual = await importOriginal<typeof ClientIpModule>();

  return { ...actual, getClientIp: async () => '1.2.3.4' };
});
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/server/shopify-helpers', () => ({
  getShopifyToken: async () => getShopifyTokenValue.current,
}));
vi.mock('@/lib/server/metadata', () => ({
  getBaseUrl: () => 'https://shop.example.com',
}));
vi.mock('@/config', () => ({
  default: {
    cookies: { sessionPresent: 'x-has-session' },
    routes: { login: '/login', sharedWishlist: '/wishlist/shared', wishlist: '/wishlist' },
  },
}));
vi.mock('@/services/cart.service', () => ({
  CartService: { addLines: (...args: unknown[]) => addLines(...(args as [])) },
}));
// Fully mocked: the real service pulls `@/shopify`, which throws without
// Storefront credentials at import time. ID shape is covered by
// `wishlist.service.test.ts`; here a faithful subset suffices.
vi.mock('@/services/wishlist.service', () => ({
  WISHLIST_MAX_ITEMS: 100,
  WISHLIST_TAG: 'wishlist',
  WishlistService: {
    getWishlistState,
    mergeWishlist,
    removeFromWishlist,
    resolveMoveToCart,
    mutateWishlist,
    resolveProductsByIds,
  },
  getWishlistIdsCached,
  isValidWishlistProductId: (value: unknown): value is string =>
    typeof value === 'string' && /^gid:\/\/shopify\/Product\/\d+$/.test(value),
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

import {
  createWishlistShareLinkAction,
  getSharedWishlistProductsAction,
  getWishlistIdsAction,
  getWishlistProductsAction,
  mergeWishlistAction,
  moveWishlistToCartAction,
  setWishlistMembershipAction,
} from './wishlistActions';

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
    getShopifyTokenValue.current = 'token-9';
    updateTag.mockClear();
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

  it('returns a generic error when the membership write throws', async () => {
    getWishlistState.mockRejectedValueOnce(new Error('network down'));

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(result).toEqual({
      message: 'Something went wrong. Please try again.',
      success: false,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the service fails without one', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [OTHER_ID] });
    mutateWishlist.mockResolvedValue({ success: false });

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(result).toEqual({
      message: 'Something went wrong. Please try again.',
      success: false,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('wishlist read rate limiting', () => {
  beforeEach(() => {
    getWishlistIdsCached.mockReset();
    resolveProductsByIds.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    getWishlistIdsCached.mockResolvedValue([PRODUCT_ID]);
    resolveProductsByIds.mockResolvedValue([]);
    getShopifyTokenValue.current = 'token-9';
  });

  it('serves cached ids under the limit with a fail-open read bucket', async () => {
    await expect(getWishlistIdsAction()).resolves.toEqual([PRODUCT_ID]);

    expect(rateLimited).toHaveBeenCalledWith(
      'wishlist:read',
      expect.stringMatching(/^1\.2\.3\.4:[0-9a-f]{16}$/),
      60,
      '1 m',
    );
    expect(getWishlistIdsCached).toHaveBeenCalledTimes(1);
  });

  it('fails open with an empty list when id reads are rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    await expect(getWishlistIdsAction()).resolves.toEqual([]);

    expect(getWishlistIdsCached).not.toHaveBeenCalled();
  });

  it('resolves products under the limit and skips the service when limited', async () => {
    await expect(getWishlistProductsAction([PRODUCT_ID])).resolves.toEqual([]);
    expect(resolveProductsByIds).toHaveBeenCalledWith([PRODUCT_ID]);

    resolveProductsByIds.mockClear();
    rateLimited.mockResolvedValueOnce(true);

    await expect(getWishlistProductsAction([PRODUCT_ID])).resolves.toEqual([]);
    expect(resolveProductsByIds).not.toHaveBeenCalled();
  });

  it('fails open with an empty list when product resolution throws', async () => {
    resolveProductsByIds.mockRejectedValueOnce(new Error('network down'));

    await expect(getWishlistProductsAction([PRODUCT_ID])).resolves.toEqual([]);
  });

  it('fails open with an empty list when cached id reads throw', async () => {
    getWishlistIdsCached.mockRejectedValueOnce(new Error('network down'));

    await expect(getWishlistIdsAction()).resolves.toEqual([]);
  });

  it('returns empty without touching the limiter for an empty id list', async () => {
    await expect(getWishlistProductsAction([])).resolves.toEqual([]);

    expect(rateLimited).not.toHaveBeenCalled();
    expect(resolveProductsByIds).not.toHaveBeenCalled();
  });

  it('returns empty for non-array input without touching the service', async () => {
    await expect(getWishlistProductsAction(undefined as unknown as string[])).resolves.toEqual([]);

    expect(resolveProductsByIds).not.toHaveBeenCalled();
  });

  it('scopes read buckets globally when there is no session token', async () => {
    getShopifyTokenValue.current = null;

    await expect(getWishlistIdsAction()).resolves.toEqual([PRODUCT_ID]);

    expect(rateLimited).toHaveBeenCalledWith('wishlist:read', '1.2.3.4', 60, '1 m');
  });

  it('scopes write buckets globally when there is no session token', async () => {
    getShopifyTokenValue.current = null;
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [OTHER_ID] });
    mutateWishlist.mockResolvedValue({ success: true, data: [OTHER_ID, PRODUCT_ID] });

    const result = await setWishlistMembershipAction(false, PRODUCT_ID);

    expect(result.success).toBe(true);
    expect(rateLimited).toHaveBeenCalledWith('wishlist:write', '1.2.3.4', 30, '1 m', {
      failClosed: true,
    });
  });
});

describe('mergeWishlistAction', () => {
  beforeEach(() => {
    getWishlistState.mockReset();
    mergeWishlist.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    updateTag.mockClear();
    getShopifyTokenValue.current = 'token-9';
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [] });
  });

  it('loads the server wishlist for an empty guest list (returning shopper)', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [OTHER_ID] });
    mergeWishlist.mockResolvedValue({ success: true, data: [OTHER_ID], merged: false });

    const result = await mergeWishlistAction([]);

    expect(result).toEqual({ success: true, data: [OTHER_ID], message: undefined });
    expect(mergeWishlist).toHaveBeenCalledWith([], CUSTOMER_ID);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('drops invalid guest ids before loading/merging', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [OTHER_ID] });
    mergeWishlist.mockResolvedValue({ success: true, data: [OTHER_ID], merged: false });

    await mergeWishlistAction(['not-a-gid', 'gid://shopify/Customer/1']);

    expect(mergeWishlist).toHaveBeenCalledWith([], CUSTOMER_ID);
  });

  it('merges a valid guest list and invalidates the cache tag', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [OTHER_ID] });
    mergeWishlist.mockResolvedValue({ success: true, data: [OTHER_ID, PRODUCT_ID], merged: true });

    const result = await mergeWishlistAction([PRODUCT_ID, PRODUCT_ID]);

    expect(mergeWishlist).toHaveBeenCalledWith([PRODUCT_ID], CUSTOMER_ID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([OTHER_ID, PRODUCT_ID]);
    expect(updateTag).toHaveBeenCalledWith('wishlist');
  });

  it('does not invalidate the cache when the guest list added nothing new', async () => {
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [PRODUCT_ID] });
    mergeWishlist.mockResolvedValue({ success: true, data: [PRODUCT_ID], merged: false });

    const result = await mergeWishlistAction([PRODUCT_ID]);

    expect(result).toEqual({ success: true, data: [PRODUCT_ID], message: undefined });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers without merging', async () => {
    getWishlistState.mockResolvedValue({ customerId: null, ids: [] });

    const result = await mergeWishlistAction([PRODUCT_ID]);

    expect(result).toEqual({ success: false, message: 'User not authenticated' });
    expect(mergeWishlist).not.toHaveBeenCalled();
  });

  it('fails closed with a session-scoped bucket when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const result = await mergeWishlistAction([PRODUCT_ID]);

    expect(result.success).toBe(false);
    expect(mergeWishlist).not.toHaveBeenCalled();
  });

  it('returns a generic error when the merge throws', async () => {
    getWishlistState.mockRejectedValueOnce(new Error('network down'));

    const result = await mergeWishlistAction([PRODUCT_ID]);

    expect(result).toEqual({
      message: 'Something went wrong. Please try again.',
      success: false,
    });
  });
});

describe('getSharedWishlistProductsAction', () => {
  beforeEach(() => {
    resolveProductsByIds.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    resolveProductsByIds.mockResolvedValue([]);
    getShopifyTokenValue.current = 'token-9';
  });

  it('validates and de-duplicates ids before resolving', async () => {
    await getSharedWishlistProductsAction([PRODUCT_ID, PRODUCT_ID, 'nope']);

    expect(resolveProductsByIds).toHaveBeenCalledWith([PRODUCT_ID]);
  });

  it('returns empty without touching the limiter for an empty payload', async () => {
    await expect(getSharedWishlistProductsAction([])).resolves.toEqual([]);

    expect(rateLimited).not.toHaveBeenCalled();
    expect(resolveProductsByIds).not.toHaveBeenCalled();
  });

  it('fails open when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    await expect(getSharedWishlistProductsAction([PRODUCT_ID])).resolves.toEqual([]);
    expect(resolveProductsByIds).not.toHaveBeenCalled();
  });
});

describe('createWishlistShareLinkAction', () => {
  beforeEach(() => {
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    getShopifyTokenValue.current = 'token-9';
  });

  it('builds an absolute share URL with the validated ids', async () => {
    const result = await createWishlistShareLinkAction([PRODUCT_ID, OTHER_ID]);

    expect(result.success).toBe(true);
    expect(result.url).toBe(
      `https://shop.example.com/wishlist/shared?ids=${PRODUCT_ID},${OTHER_ID}`,
    );
  });

  it('rejects an empty wishlist', async () => {
    const result = await createWishlistShareLinkAction([]);

    expect(result).toEqual({ success: false, message: 'Your wishlist is empty' });
    expect(rateLimited).not.toHaveBeenCalled();
  });

  it('fails when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const result = await createWishlistShareLinkAction([PRODUCT_ID]);

    expect(result.success).toBe(false);
  });
});

describe('moveWishlistToCartAction', () => {
  const resolution = () => ({
    success: true,
    lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }],
    movedProductIds: [PRODUCT_ID],
    skipped: 0,
  });

  beforeEach(() => {
    addLines.mockReset();
    getWishlistState.mockReset();
    removeFromWishlist.mockReset();
    resolveMoveToCart.mockReset();
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    updateTag.mockClear();
    getShopifyTokenValue.current = 'token-9';
    getWishlistState.mockResolvedValue({ customerId: CUSTOMER_ID, ids: [PRODUCT_ID] });
    removeFromWishlist.mockResolvedValue({ success: true, data: [] });
    addLines.mockResolvedValue({ id: 'gid://shopify/Cart/1', lines: { edges: [] } });
  });

  it('rejects an invalid id list', async () => {
    const result = await moveWishlistToCartAction(['bad']);

    expect(result.success).toBe(false);
    expect(resolveMoveToCart).not.toHaveBeenCalled();
  });

  it('adds to the cart, then removes from the wishlist, then invalidates the tag', async () => {
    resolveMoveToCart.mockResolvedValue(resolution());

    const result = await moveWishlistToCartAction([PRODUCT_ID]);

    expect(resolveMoveToCart).toHaveBeenCalledWith([PRODUCT_ID]);
    expect(addLines).toHaveBeenCalledWith([
      { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 },
    ]);
    expect(removeFromWishlist).toHaveBeenCalledWith([PRODUCT_ID], CUSTOMER_ID);
    expect(result.success).toBe(true);
    expect(result.cart).toEqual({ id: 'gid://shopify/Cart/1', lines: { edges: [] } });
    expect(result.message).toBe('1 item moved to your cart');
    expect(updateTag).toHaveBeenCalledWith('wishlist');
  });

  it('does not touch the wishlist when the cart write throws', async () => {
    resolveMoveToCart.mockResolvedValue(resolution());
    addLines.mockRejectedValueOnce(new Error('cart down'));

    const result = await moveWishlistToCartAction([PRODUCT_ID]);

    expect(result.success).toBe(false);
    expect(removeFromWishlist).not.toHaveBeenCalled();
  });

  it('reports skipped items in the message', async () => {
    resolveMoveToCart.mockResolvedValue({ ...resolution(), skipped: 2 });

    const result = await moveWishlistToCartAction([PRODUCT_ID, OTHER_ID]);

    expect(result.message).toBe('1 item moved to your cart (2 unavailable skipped)');
  });

  it('rejects unauthenticated callers', async () => {
    getWishlistState.mockResolvedValue({ customerId: null, ids: [] });

    const result = await moveWishlistToCartAction([PRODUCT_ID]);

    expect(result).toEqual({ success: false, message: 'User not authenticated' });
    expect(resolveMoveToCart).not.toHaveBeenCalled();
  });

  it('surfaces a resolution failure without touching the cart', async () => {
    resolveMoveToCart.mockResolvedValue({ success: false, message: 'No items available' });

    const result = await moveWishlistToCartAction([PRODUCT_ID]);

    expect(result.success).toBe(false);
    expect(addLines).not.toHaveBeenCalled();
  });

  it('fails when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const result = await moveWishlistToCartAction([PRODUCT_ID]);

    expect(result.success).toBe(false);
    expect(resolveMoveToCart).not.toHaveBeenCalled();
  });
});
