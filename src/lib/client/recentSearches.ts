import { prependUnique, readLocalList, writeLocalList } from './localList';

export const RECENT_SEARCHES_KEY = 'recent-searches';
export const RECENT_SEARCHES_MAX = 6;

/** Search terms entered on this device, most recent first. */
export const readRecentSearches = (): string[] =>
  readLocalList(RECENT_SEARCHES_KEY, RECENT_SEARCHES_MAX);

/** Record a search term and return the updated list. */
export const addRecentSearch = (term: string): string[] => {
  const next = prependUnique(readRecentSearches(), term, RECENT_SEARCHES_MAX);
  writeLocalList(RECENT_SEARCHES_KEY, next);
  return next;
};

export const clearRecentSearches = (): void => {
  writeLocalList(RECENT_SEARCHES_KEY, []);
};
