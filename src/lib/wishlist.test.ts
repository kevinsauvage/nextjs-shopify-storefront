import {
  isValidWishlistProductId,
  mergeWishlistIds,
  WISHLIST_MAX_ID_LENGTH,
  WISHLIST_MAX_ITEMS,
} from './wishlist';

import { describe, expect, it } from 'vitest';

const productGid = (id: number) => `gid://shopify/Product/${id}`;

const PRODUCT_A = productGid(1);
const PRODUCT_B = productGid(2);

describe('isValidWishlistProductId', () => {
  it.each([
    ['a product gid', PRODUCT_A, true],
    ['a bare id', '123', false],
    ['a non-product gid', 'gid://shopify/Customer/1', false],
    ['an empty string', '', false],
    ['a non-string', 42, false],
    ['a gid with a suffix', `${PRODUCT_A}/x`, false],
  ])('%s -> %s', (_label, value, expected) => {
    expect(isValidWishlistProductId(value)).toBe(expected);
  });

  it('rejects ids longer than the max', () => {
    const longId = `gid://shopify/Product/${'1'.repeat(WISHLIST_MAX_ID_LENGTH)}`;

    expect(isValidWishlistProductId(longId)).toBe(false);
  });
});

describe('mergeWishlistIds', () => {
  it('returns the server list untouched when the guest list is empty', () => {
    expect(mergeWishlistIds([PRODUCT_A, PRODUCT_B], [])).toEqual([PRODUCT_A, PRODUCT_B]);
  });

  it('appends guest-only ids after the server list (union)', () => {
    expect(mergeWishlistIds([PRODUCT_A], [PRODUCT_B, PRODUCT_A])).toEqual([PRODUCT_A, PRODUCT_B]);
  });

  it('keeps server order on ties and de-duplicates', () => {
    expect(mergeWishlistIds([PRODUCT_B, PRODUCT_A], [PRODUCT_A, PRODUCT_B])).toEqual([
      PRODUCT_B,
      PRODUCT_A,
    ]);
  });

  it('drops invalid ids from both sides', () => {
    expect(mergeWishlistIds([PRODUCT_A, 'nope'], ['gid://shopify/Customer/1', PRODUCT_B])).toEqual([
      PRODUCT_A,
      PRODUCT_B,
    ]);
  });

  it('caps the union at the wishlist maximum, evicting guest ids first', () => {
    const server = Array.from({ length: WISHLIST_MAX_ITEMS - 1 }, (_, i) => productGid(3000 + i));
    const guest = [productGid(9998), productGid(9999)];

    const merged = mergeWishlistIds(server, guest);

    expect(merged).toHaveLength(WISHLIST_MAX_ITEMS);
    // The existing server item is kept; only one guest id fits.
    expect(merged).toContain(server[0]);
    expect(merged).toContain(guest[0]);
    expect(merged).not.toContain(guest[1]);
  });
});
