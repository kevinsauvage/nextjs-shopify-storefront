import { prependUnique, readLocalList, writeLocalList } from './localList';

export const RECENTLY_VIEWED_KEY = 'recently-viewed';
export const RECENTLY_VIEWED_MAX = 12;

/** Product GIDs viewed on this device, most recent first. */
export const readRecentlyViewed = (): string[] =>
  readLocalList(RECENTLY_VIEWED_KEY, RECENTLY_VIEWED_MAX);

/** Record a product view and return the updated list. */
export const addRecentlyViewed = (productId: string): string[] => {
  const next = prependUnique(readRecentlyViewed(), productId, RECENTLY_VIEWED_MAX);
  writeLocalList(RECENTLY_VIEWED_KEY, next);
  return next;
};
