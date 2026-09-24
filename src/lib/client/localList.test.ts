import { prependUnique, readLocalList, writeLocalList } from './localList';

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

describe('prependUnique', () => {
  it('prepends a new value', () => {
    expect(prependUnique(['a', 'b'], 'c', 5)).toEqual(['c', 'a', 'b']);
  });

  it('moves an existing value to the front without duplicating', () => {
    expect(prependUnique(['a', 'b', 'c'], 'b', 5)).toEqual(['b', 'a', 'c']);
  });

  it('de-duplicates case-insensitively', () => {
    expect(prependUnique(['Linen'], 'linen', 5)).toEqual(['linen']);
  });

  it('caps the list length', () => {
    expect(prependUnique(['a', 'b', 'c'], 'd', 2)).toEqual(['d', 'a']);
  });

  it('leaves the list untouched for blank values', () => {
    expect(prependUnique(['a'], '   ', 5)).toEqual(['a']);
  });
});

describe('local list storage', () => {
  const KEY = 'test-list';

  beforeEach(() => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn(), localStorage: createStorage() });
  });

  it('round-trips values', () => {
    writeLocalList(KEY, ['a', 'b']);

    expect(readLocalList(KEY, 5)).toEqual(['a', 'b']);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(readLocalList(KEY, 5)).toEqual([]);
  });

  it('drops malformed entries and caps the length', () => {
    window.localStorage.setItem(KEY, JSON.stringify(['a', 1, null, 'b', 'c']));

    expect(readLocalList(KEY, 2)).toEqual(['a', 'b']);
  });

  it('returns an empty list instead of throwing on corrupt JSON', () => {
    window.localStorage.setItem(KEY, '{not json');

    expect(readLocalList(KEY, 5)).toEqual([]);
  });

  it('no-ops without a window (SSR)', () => {
    vi.stubGlobal('window', undefined);

    expect(readLocalList(KEY, 5)).toEqual([]);
    expect(() => writeLocalList(KEY, ['a'])).not.toThrow();
  });
});
