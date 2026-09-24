import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminSdk, getCustomer, getProductsByIds, getShopifyToken, metafieldsSet } = vi.hoisted(
  () => ({
    adminSdk: vi.fn(),
    getCustomer: vi.fn(),
    getProductsByIds: vi.fn(),
    getShopifyToken: vi.fn(),
    metafieldsSet: vi.fn(),
  }),
);

vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken }));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/shopify', () => ({
  adminSdk: () => ({ MetafieldsSet: metafieldsSet }),
  storefrontSdk: () => ({ getCustomer, getProductsByIds }),
}));

import { reportError } from '@/lib/logger';

import {
  getWishlistIdsCached,
  isValidWishlistProductId,
  WISHLIST_MAX_ID_LENGTH,
  WISHLIST_MAX_ITEMS,
  WishlistService,
} from './wishlist.service';

const CUSTOMER_ID = 'gid://shopify/Customer/1';
const productGid = (id: number) => `gid://shopify/Product/${id}`;

const PRODUCT_A = productGid(1);
const PRODUCT_B = productGid(2);

const mockWishlist = (ids: string[]) => {
  getShopifyToken.mockResolvedValue('token');
  getCustomer.mockResolvedValue({
    customer: { id: CUSTOMER_ID, metafields: [{ value: JSON.stringify(ids) }] },
  });
};

describe('isValidWishlistProductId', () => {
  it.each([
    ['a product gid', PRODUCT_A, true],
    ['a bare id', '123', false],
    ['a non-product gid', 'gid://shopify/Customer/1', false],
    ['an empty string', '', false],
    ['a non-string', 42, false],
    ['a gid with a suffix', `${PRODUCT_A}/x`, false],
  ])('%s -> %s', (_label, value, expected) => {
    expect(isValidWishlistProductId(value)).toBe(expected);
  });
});

describe('WishlistService', () => {
  beforeEach(() => {
    adminSdk.mockReset();
    getCustomer.mockReset();
    getProductsByIds.mockReset();
    getShopifyToken.mockReset();
    metafieldsSet.mockReset();
  });

  it('reads the ids and customer id in a single request', async () => {
    mockWishlist([PRODUCT_A, PRODUCT_B]);

    await expect(WishlistService.getWishlistState()).resolves.toEqual({
      customerId: CUSTOMER_ID,
      ids: [PRODUCT_A, PRODUCT_B],
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

  it('drops invalid ids stored in the metafield', async () => {
    mockWishlist([PRODUCT_A, 'not-a-gid', 'gid://shopify/Customer/9']);

    await expect(WishlistService.getWishlistIds()).resolves.toEqual([PRODUCT_A]);
  });

  it('persists the wishlist in a single deduplicated write', async () => {
    metafieldsSet.mockResolvedValue({ metafieldsSet: { userErrors: [] } });

    await expect(
      WishlistService.updateWishlist([PRODUCT_A, PRODUCT_A, PRODUCT_B], CUSTOMER_ID),
    ).resolves.toEqual({ success: true, data: [PRODUCT_A, PRODUCT_B] });
    expect(metafieldsSet).toHaveBeenCalledTimes(1);
  });

  it('strips invalid ids before writing', async () => {
    metafieldsSet.mockResolvedValue({ metafieldsSet: { userErrors: [] } });

    const result = await WishlistService.updateWishlist(
      [PRODUCT_A, 'gid://shopify/Order/1'],
      CUSTOMER_ID,
    );

    expect(result.data).toEqual([PRODUCT_A]);
  });

  it('fails gracefully when the Admin API is not configured', async () => {
    metafieldsSet.mockRejectedValue(new Error('Shopify Admin API is not configured'));

    const result = await WishlistService.updateWishlist([PRODUCT_A], CUSTOMER_ID);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Admin API/);
  });

  it('rejects resolving unauthenticated/malformed input without calling Shopify', async () => {
    await expect(WishlistService.resolveProductsByIds(['123', 'nope'])).resolves.toEqual([]);
    expect(getProductsByIds).not.toHaveBeenCalled();
  });

  describe('mutateWishlist', () => {
    it('adds an item using the freshly read wishlist', async () => {
      mockWishlist([PRODUCT_A]);
      metafieldsSet.mockResolvedValue({ metafieldsSet: { userErrors: [] } });

      await expect(
        WishlistService.mutateWishlist({ action: 'add', productId: PRODUCT_B }, CUSTOMER_ID),
      ).resolves.toEqual({ success: true, data: [PRODUCT_A, PRODUCT_B] });
    });

    it('is a no-op when adding an item already present', async () => {
      mockWishlist([PRODUCT_A]);

      await expect(
        WishlistService.mutateWishlist({ action: 'add', productId: PRODUCT_A }, CUSTOMER_ID),
      ).resolves.toEqual({ success: true, data: [PRODUCT_A] });
      expect(metafieldsSet).not.toHaveBeenCalled();
    });

    it('refuses to write when the session changed while queued', async () => {
      // The service re-reads the customer id; a different one means a new login.
      getShopifyToken.mockResolvedValue('token');
      getCustomer.mockResolvedValue({
        customer: { id: 'gid://shopify/Customer/2', metafields: [{ value: '[]' }] },
      });

      const result = await WishlistService.mutateWishlist(
        { action: 'add', productId: PRODUCT_A },
        CUSTOMER_ID,
      );

      expect(result.success).toBe(false);
      expect(metafieldsSet).not.toHaveBeenCalled();
    });

    it('serializes concurrent mutations so neither update is lost', async () => {
      // Stateful wishlist: each write is visible to the next read, which is what
      // makes lost updates observable.
      let stored: string[] = [];
      getShopifyToken.mockResolvedValue('token');
      getCustomer.mockImplementation(async () => ({
        customer: { id: CUSTOMER_ID, metafields: [{ value: JSON.stringify(stored) }] },
      }));
      metafieldsSet.mockImplementation(
        async ({ metafields }: { metafields: { value: string }[] }) => {
          stored = JSON.parse(metafields[0]?.value ?? '[]');
          return { metafieldsSet: { userErrors: [] } };
        },
      );

      const [, second] = await Promise.all([
        WishlistService.mutateWishlist({ action: 'add', productId: PRODUCT_A }, CUSTOMER_ID),
        WishlistService.mutateWishlist({ action: 'add', productId: PRODUCT_B }, CUSTOMER_ID),
      ]);

      // The slower write must have seen the first one's result, not an empty list.
      expect(second.data).toEqual([PRODUCT_A, PRODUCT_B]);
    });
  });

  describe('getWishlistState edge cases', () => {
    it('returns empty when Shopify returns no customer', async () => {
      getShopifyToken.mockResolvedValue('token');
      getCustomer.mockResolvedValue({ customer: null });

      await expect(WishlistService.getWishlistState()).resolves.toEqual({
        customerId: null,
        ids: [],
      });
    });

    it('returns empty for a non-array JSON metafield', async () => {
      getShopifyToken.mockResolvedValue('token');
      getCustomer.mockResolvedValue({
        customer: { id: CUSTOMER_ID, metafields: [{ value: '{"a":1}' }] },
      });

      await expect(WishlistService.getWishlistIds()).resolves.toEqual([]);
    });

    it('returns empty when the metafield is missing', async () => {
      getShopifyToken.mockResolvedValue('token');
      getCustomer.mockResolvedValue({ customer: { id: CUSTOMER_ID, metafields: [] } });

      await expect(WishlistService.getWishlistIds()).resolves.toEqual([]);
    });
  });

  describe('resolveProductsByIds', () => {
    it('returns empty without calling Shopify for an empty list', async () => {
      await expect(WishlistService.resolveProductsByIds([])).resolves.toEqual([]);
      expect(getProductsByIds).not.toHaveBeenCalled();
    });

    it('resolves products preserving request order and dropping missing', async () => {
      const nodeA = { id: PRODUCT_A, title: 'A' };
      const nodeB = { id: PRODUCT_B, title: 'B' };
      getProductsByIds.mockResolvedValue({ nodes: [nodeB, null, nodeA, undefined] });

      const result = await WishlistService.resolveProductsByIds([
        PRODUCT_A,
        PRODUCT_B,
        productGid(999),
      ]);

      expect(getProductsByIds).toHaveBeenCalledWith(
        expect.objectContaining({ ids: [PRODUCT_A, PRODUCT_B, productGid(999)] }),
      );
      expect(result.map((p) => p.id)).toEqual([PRODUCT_A, PRODUCT_B]);
    });

    it('deduplicates ids and caps the request', async () => {
      const many = Array.from({ length: WISHLIST_MAX_ITEMS + 10 }, (_, i) => productGid(1000 + i));
      getProductsByIds.mockResolvedValue({ nodes: [] });

      await expect(WishlistService.resolveProductsByIds([...many, ...many])).resolves.toEqual([]);
      const calledIds = getProductsByIds.mock.calls[0]?.[0] as { ids: string[] } | undefined;
      expect(calledIds?.ids).toHaveLength(WISHLIST_MAX_ITEMS);
    });

    it('returns empty when Shopify returns no nodes', async () => {
      getProductsByIds.mockResolvedValue({ nodes: [] });

      await expect(WishlistService.resolveProductsByIds([PRODUCT_A])).resolves.toEqual([]);
    });

    it('returns empty when Shopify returns an empty response', async () => {
      getProductsByIds.mockResolvedValue({});

      await expect(WishlistService.resolveProductsByIds([PRODUCT_A])).resolves.toEqual([]);
    });

    it('returns empty and reports when Shopify throws', async () => {
      getProductsByIds.mockRejectedValue(new Error('network down'));

      await expect(WishlistService.resolveProductsByIds([PRODUCT_A])).resolves.toEqual([]);
      expect(reportError).toHaveBeenCalledWith(
        'WishlistService.resolveProductsByIds',
        expect.any(Error),
      );
    });
  });

  describe('updateWishlist errors', () => {
    it('returns an error when Shopify reports user errors', async () => {
      metafieldsSet.mockResolvedValue({
        metafieldsSet: { userErrors: [{ message: 'Invalid' }] },
      });

      const result = await WishlistService.updateWishlist([PRODUCT_A], CUSTOMER_ID);

      expect(result).toEqual({
        message: 'Something went wrong updating the wishlist',
        success: false,
      });
      expect(reportError).toHaveBeenCalledWith(
        'WishlistService.updateWishlist - MetafieldsSet errors',
        expect.anything(),
      );
    });
  });

  describe('mutateWishlist branches', () => {
    it('rejects an invalid product id without reading state', async () => {
      const result = await WishlistService.mutateWishlist(
        { action: 'add', productId: 'bad' },
        CUSTOMER_ID,
      );

      expect(result).toEqual({ message: 'Invalid product ID', success: false });
      expect(getCustomer).not.toHaveBeenCalled();
    });

    it('fails when the wishlist is full', async () => {
      const full = Array.from({ length: WISHLIST_MAX_ITEMS }, (_, i) => productGid(2000 + i));
      mockWishlist(full);

      const result = await WishlistService.mutateWishlist(
        { action: 'add', productId: PRODUCT_A },
        CUSTOMER_ID,
      );

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/full/);
      expect(metafieldsSet).not.toHaveBeenCalled();
    });

    it('removes an existing item', async () => {
      mockWishlist([PRODUCT_A, PRODUCT_B]);
      metafieldsSet.mockResolvedValue({ metafieldsSet: { userErrors: [] } });

      await expect(
        WishlistService.mutateWishlist({ action: 'remove', productId: PRODUCT_A }, CUSTOMER_ID),
      ).resolves.toEqual({ data: [PRODUCT_B], success: true });
    });

    it('is a no-op when removing an item already absent', async () => {
      mockWishlist([PRODUCT_A]);

      await expect(
        WishlistService.mutateWishlist({ action: 'remove', productId: PRODUCT_B }, CUSTOMER_ID),
      ).resolves.toEqual({ data: [PRODUCT_A], success: true });
      expect(metafieldsSet).not.toHaveBeenCalled();
    });
  });

  describe('getWishlistIdsCached', () => {
    it('returns cached ids from state', async () => {
      mockWishlist([PRODUCT_A]);

      await expect(getWishlistIdsCached()).resolves.toEqual([PRODUCT_A]);
    });
  });

  describe('isValidWishlistProductId limits', () => {
    it('rejects ids longer than the max', () => {
      const longId = `gid://shopify/Product/${'1'.repeat(WISHLIST_MAX_ID_LENGTH)}`;

      expect(isValidWishlistProductId(longId)).toBe(false);
    });
  });
});
