import {
  addGuestWishlist,
  clearGuestWishlist,
  GUEST_WISHLIST_KEY,
  GUEST_WISHLIST_MAX,
  readGuestWishlist,
  removeGuestWishlist,
  writeGuestWishlist,
} from './guestWishlist';

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

describe('guest wishlist', () => {
  it('records saved products most-recent-first', () => {
    addGuestWishlist('gid://shopify/Product/1');
    addGuestWishlist('gid://shopify/Product/2');

    expect(readGuestWishlist()).toEqual(['gid://shopify/Product/2', 'gid://shopify/Product/1']);
  });

  it('moves a re-saved product to the front without duplicating', () => {
    addGuestWishlist('a');
    addGuestWishlist('b');
    addGuestWishlist('a');

    expect(readGuestWishlist()).toEqual(['a', 'b']);
  });

  it('removes a product', () => {
    writeGuestWishlist(['a', 'b']);

    expect(removeGuestWishlist('a')).toEqual(['b']);
    expect(readGuestWishlist()).toEqual(['b']);
  });

  it('caps the list at the guest maximum', () => {
    for (let index = 0; index < GUEST_WISHLIST_MAX + 5; index += 1) {
      addGuestWishlist(`id-${index}`);
    }

    expect(readGuestWishlist()).toHaveLength(GUEST_WISHLIST_MAX);
  });

  it('clears the list', () => {
    writeGuestWishlist(['a']);
    clearGuestWishlist();

    expect(readGuestWishlist()).toEqual([]);
  });

  it('no-ops without a window (SSR)', () => {
    vi.stubGlobal('window', undefined);

    expect(readGuestWishlist()).toEqual([]);
    expect(() => addGuestWishlist('a')).not.toThrow();
    expect(() => clearGuestWishlist()).not.toThrow();
  });

  it('uses the documented storage key', () => {
    writeGuestWishlist(['a']);

    expect(window.localStorage.getItem(GUEST_WISHLIST_KEY)).toBe(JSON.stringify(['a']));
  });
});
