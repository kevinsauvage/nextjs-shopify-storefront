import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClientIp, getProducts, rateLimited, resolveProductsByIds } = vi.hoisted(() => ({
  getClientIp: vi.fn(async () => '1.2.3.4'),
  getProducts: vi.fn(),
  rateLimited: vi.fn(async () => false),
  resolveProductsByIds: vi.fn(),
}));

vi.mock('@/lib/server/client-ip', () => ({ getClientIp }));
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));
vi.mock('@/services/wishlist.service', () => ({
  WISHLIST_MAX_ITEMS: 100,
  WishlistService: { resolveProductsByIds },
}));
vi.mock('@/shopify', () => ({ storefrontSdk: () => ({ getProducts }) }));

import { getBestSellersAction, getProductsByIdsAction } from './productsActions';

const PRODUCT = { id: 'gid://shopify/Product/1' };

describe('getProductsByIdsAction', () => {
  beforeEach(() => {
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    resolveProductsByIds.mockReset();
    resolveProductsByIds.mockResolvedValue([PRODUCT]);
  });

  it('resolves valid ids through the shared resolver', async () => {
    await expect(getProductsByIdsAction([PRODUCT.id])).resolves.toEqual([PRODUCT]);
    expect(resolveProductsByIds).toHaveBeenCalledWith([PRODUCT.id]);
  });

  it('short-circuits an empty list without rate-limit or lookup', async () => {
    await expect(getProductsByIdsAction([])).resolves.toEqual([]);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(resolveProductsByIds).not.toHaveBeenCalled();
  });

  it('fails open (empty) when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    await expect(getProductsByIdsAction([PRODUCT.id])).resolves.toEqual([]);
    expect(resolveProductsByIds).not.toHaveBeenCalled();
  });

  it('swallows resolver failures into an empty list', async () => {
    resolveProductsByIds.mockRejectedValue(new Error('network down'));

    await expect(getProductsByIdsAction([PRODUCT.id])).resolves.toEqual([]);
  });
});

describe('getBestSellersAction', () => {
  beforeEach(() => {
    getProducts.mockReset();
    getProducts.mockResolvedValue({ products: { edges: [{ node: PRODUCT }] } });
  });

  it('returns the best-selling products', async () => {
    await expect(getBestSellersAction()).resolves.toEqual([PRODUCT]);
    expect(getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ identifiers: [], sortKey: 'BEST_SELLING' }),
    );
  });

  it('clamps an oversized limit', async () => {
    await getBestSellersAction(999);

    expect(getProducts).toHaveBeenCalledWith(expect.objectContaining({ first: 8 }));
  });

  it('clamps a non-positive limit to 1', async () => {
    await getBestSellersAction(0);

    expect(getProducts).toHaveBeenCalledWith(expect.objectContaining({ first: 1 }));
  });

  it('swallows failures into an empty list', async () => {
    getProducts.mockRejectedValue(new Error('network down'));

    await expect(getBestSellersAction()).resolves.toEqual([]);
  });
});
