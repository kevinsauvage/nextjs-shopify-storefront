import { prependUnique, readLocalList, writeLocalList } from './localList';

/** Device-local wishlist for signed-out shoppers, merged on login. */
export const GUEST_WISHLIST_KEY = 'guest-wishlist';

/** Kept below the server cap so the login union always fits. */
export const GUEST_WISHLIST_MAX = 50;

/** Product GIDs saved on this device before login, most recent first. */
export const readGuestWishlist = (): string[] =>
  readLocalList(GUEST_WISHLIST_KEY, GUEST_WISHLIST_MAX);

export const writeGuestWishlist = (ids: string[]): void =>
  writeLocalList(GUEST_WISHLIST_KEY, ids.slice(0, GUEST_WISHLIST_MAX));

/** Add a product id, most-recent-first and de-duplicated. */
export const addGuestWishlist = (productId: string): string[] => {
  const next = prependUnique(readGuestWishlist(), productId, GUEST_WISHLIST_MAX);
  writeLocalList(GUEST_WISHLIST_KEY, next);
  return next;
};

export const removeGuestWishlist = (productId: string): string[] => {
  const next = readGuestWishlist().filter((id) => id !== productId);
  writeLocalList(GUEST_WISHLIST_KEY, next);
  return next;
};

/** Drop the guest list, e.g. after it has been merged into an account. */
export const clearGuestWishlist = (): void => {
  writeLocalList(GUEST_WISHLIST_KEY, []);
};
