import { beforeEach, describe, expect, it, vi } from 'vitest';

const { collection, getCollectionsForSitemap } = vi.hoisted(() => ({
  collection: vi.fn(),
  getCollectionsForSitemap: vi.fn(),
}));

vi.mock('@/shopify', () => ({ storefrontSdk: () => ({ collection, getCollectionsForSitemap }) }));

import {
  fetchCollectionPage,
  getCollectionHandlesForStaticParams,
  normalizeSortKey,
  resolveCollectionSortKey,
} from './collection';

describe('normalizeSortKey', () => {
  it('compares sort keys ignoring case and separators', () => {
    expect(normalizeSortKey('best-selling')).toBe('bestselling');
    expect(normalizeSortKey('BEST_SELLING')).toBe('bestselling');
    expect(normalizeSortKey('price')).toBe('price');
  });
});

describe('resolveCollectionSortKey', () => {
  it('resolves known keys case-insensitively', () => {
    expect(resolveCollectionSortKey('price')).toBe('PRICE');
    expect(resolveCollectionSortKey('best-selling')).toBe('BEST_SELLING');
  });

  it('falls back to BEST_SELLING for unknown or missing keys', () => {
    expect(resolveCollectionSortKey('nope')).toBe('BEST_SELLING');
    expect(resolveCollectionSortKey(undefined)).toBe('BEST_SELLING');
  });
});

describe('fetchCollectionPage', () => {
  beforeEach(() => {
    collection.mockReset();
  });

  it('fetches one page with the resolved sort key', async () => {
    collection.mockResolvedValue({ collection: { handle: 'all' } });

    await expect(fetchCollectionPage('all', { sort_key: 'price' })).resolves.toEqual({
      handle: 'all',
    });
    expect(collection).toHaveBeenCalledWith(
      expect.objectContaining({ handle: 'all', sortKey: 'PRICE' }),
    );
  });

  it('returns null when the collection is missing', async () => {
    collection.mockResolvedValue({ collection: null });

    await expect(fetchCollectionPage('gone')).resolves.toBeNull();
  });
});

describe('getCollectionHandlesForStaticParams', () => {
  beforeEach(() => {
    getCollectionsForSitemap.mockReset();
  });

  it('walks every cursor page and skips edges without a handle', async () => {
    getCollectionsForSitemap
      .mockResolvedValueOnce({
        collections: {
          edges: [{ node: { handle: 'a' } }, { node: { handle: null } }],
          pageInfo: { endCursor: 'c1', hasNextPage: true },
        },
      })
      .mockResolvedValueOnce({
        collections: {
          edges: [{ node: { handle: 'b' } }],
          pageInfo: { endCursor: null, hasNextPage: false },
        },
      });

    await expect(getCollectionHandlesForStaticParams()).resolves.toEqual([
      { collectionSlug: 'a' },
      { collectionSlug: 'b' },
    ]);
    expect(getCollectionsForSitemap).toHaveBeenCalledTimes(2);
    expect(getCollectionsForSitemap).toHaveBeenNthCalledWith(2, { after: 'c1', first: 250 });
  });
});
