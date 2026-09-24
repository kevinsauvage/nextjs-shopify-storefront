import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getShopMetaObjects } = vi.hoisted(() => ({ getShopMetaObjects: vi.fn() }));

vi.mock('@/shopify', () => ({ storefrontSdk: () => ({ getShopMetaObjects }) }));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

import {
  DEFAULT_POPULAR_SEARCHES,
  getPopularSearchTerms,
  POPULAR_SEARCH_METAOBJECT_TYPE,
} from './popularSearches';

const metaobject = (fields: Array<{ key: string; value: string | null }>) => ({
  node: { fields },
});

describe('getPopularSearchTerms', () => {
  beforeEach(() => {
    getShopMetaObjects.mockReset();
  });

  it('reads the curated terms from the metaobject', async () => {
    getShopMetaObjects.mockResolvedValue({
      metaobjects: { edges: [metaobject([{ key: 'term', value: 'Linen' }])] },
    });

    await expect(getPopularSearchTerms()).resolves.toEqual(['Linen']);
    expect(getShopMetaObjects).toHaveBeenCalledWith({
      first: 8,
      type: POPULAR_SEARCH_METAOBJECT_TYPE,
    });
  });

  it('accepts alternate field keys', async () => {
    getShopMetaObjects.mockResolvedValue({
      metaobjects: {
        edges: [
          metaobject([{ key: 'query', value: 'Denim' }]),
          metaobject([{ key: 'label', value: 'Knit' }]),
        ],
      },
    });

    await expect(getPopularSearchTerms()).resolves.toEqual(['Denim', 'Knit']);
  });

  it('de-duplicates and drops blanks', async () => {
    getShopMetaObjects.mockResolvedValue({
      metaobjects: {
        edges: [
          metaobject([{ key: 'term', value: 'Linen' }]),
          metaobject([{ key: 'term', value: 'Linen' }]),
          metaobject([{ key: 'term', value: '   ' }]),
        ],
      },
    });

    await expect(getPopularSearchTerms()).resolves.toEqual(['Linen']);
  });

  it('falls back to the defaults when nothing is curated', async () => {
    getShopMetaObjects.mockResolvedValue({ metaobjects: { edges: [] } });

    await expect(getPopularSearchTerms()).resolves.toEqual([...DEFAULT_POPULAR_SEARCHES]);
  });

  it('falls back to the defaults when the read fails', async () => {
    getShopMetaObjects.mockRejectedValue(new Error('network down'));

    await expect(getPopularSearchTerms()).resolves.toEqual([...DEFAULT_POPULAR_SEARCHES]);
  });
});
