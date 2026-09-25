/**
 * Pure wishlist helpers shared by the server service and the client context.
 *
 * Kept out of `wishlist.service.ts` (which is `server-only` and pulls in the
 * Shopify SDK) so client components can merge lists without importing a module
 * that throws without Storefront credentials.
 */

/** Shopify product global id, e.g. `gid://shopify/Product/1234567890`. */
const PRODUCT_GID_PATTERN = /^gid:\/\/shopify\/Product\/\d+$/;

/** Longest a single product GID may be; also caps raw client input. */
export const WISHLIST_MAX_ID_LENGTH = 255;

/** Server-side wishlist cap, mirrored from the metafield writer. */
export const WISHLIST_MAX_ITEMS = 100;

export const isValidWishlistProductId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= WISHLIST_MAX_ID_LENGTH &&
  PRODUCT_GID_PATTERN.test(value);

/**
 * Union of the server metafield and a guest list, deduped and capped.
 * Server ids come first (order preserved, wins on ties); guest-only ids are
 * appended, so overflow drops guest ids rather than the customer's saved ones.
 */
export const mergeWishlistIds = (serverIds: string[], guestIds: string[]): string[] => {
  const merged = [...serverIds.filter(isValidWishlistProductId)];

  for (const id of guestIds) {
    if (merged.length >= WISHLIST_MAX_ITEMS) break;
    if (isValidWishlistProductId(id) && !merged.includes(id)) merged.push(id);
  }

  return merged;
};
