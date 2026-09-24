import { addRecentlyViewed, readRecentlyViewed } from './recentlyViewed';
import { addRecentSearch, clearRecentSearches, readRecentSearches } from './recentSearches';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const createStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

beforeEach(() => {
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), localStorage: createStorage() });
});

describe('recently viewed', () => {
  it('records views most-recent-first', () => {
    addRecentlyViewed('gid://shopify/Product/1');
    addRecentlyViewed('gid://shopify/Product/2');

    expect(readRecentlyViewed()).toEqual([
      'gid://shopify/Product/2',
      'gid://shopify/Product/1',
    ]);
  });

  it('moves a re-viewed product to the front without duplicating', () => {
    addRecentlyViewed('a');
    addRecentlyViewed('b');
    addRecentlyViewed('a');

    expect(readRecentlyViewed()).toEqual(['a', 'b']);
  });
});

describe('recent searches', () => {
  it('records terms most-recent-first and de-duplicates', () => {
    addRecentSearch('linen');
    addRecentSearch('denim');
    addRecentSearch('Linen');

    expect(readRecentSearches()).toEqual(['Linen', 'denim']);
  });

  it('clears the list', () => {
    addRecentSearch('linen');
    clearRecentSearches();

    expect(readRecentSearches()).toEqual([]);
  });
});
