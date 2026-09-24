'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { readLocalList, subscribeLocalList } from '@/lib/client/localList';

const EMPTY: string[] = [];

/**
 * Cached snapshots keyed by storage key. `useSyncExternalStore` requires
 * `getSnapshot` to return a referentially stable value while the underlying
 * data is unchanged, so the parsed array is memoized against the raw string.
 */
const snapshots = new Map<string, { raw: string | null; value: string[] }>();

/** Read a device-local ordered string list, keeping server and client in sync. */
export const useLocalList = (key: string, max: number): string[] => {
  const getSnapshot = useCallback((): string[] => {
    if (typeof window === 'undefined') return EMPTY;

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // Blocked storage: treat as empty.
      return EMPTY;
    }

    const cached = snapshots.get(key);
    if (cached && cached.raw === raw) return cached.value;

    const value = readLocalList(key, max);
    snapshots.set(key, { raw, value });

    return value;
  }, [key, max]);

  const subscribe = useCallback((onChange: () => void) => subscribeLocalList(onChange), []);

  const getServerSnapshot = useCallback((): string[] => EMPTY, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
