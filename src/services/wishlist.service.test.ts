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
vi.mock('@/shopify', () => ({
  adminSdk: () => ({ MetafieldsSet: metafieldsSet }),
  storefrontSdk: () => ({ getCustomer, getProductsByIds }),
}));

import { isValidWishlistProductId, WishlistService } from './wishlist.service';

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
});
