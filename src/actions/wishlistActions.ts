'use server';

import { updateTag } from 'next/cache';

import { reportError } from '@/lib/logger';
import { fingerprintForRateLimit, getClientIp, rateLimitKey } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import {
  getWishlistIdsCached,
  isValidWishlistProductId,
  WISHLIST_MAX_ITEMS,
  WISHLIST_TAG,
  WishlistService,
} from '@/services/wishlist.service';
import type { ProductFieldsFragment } from '@/shopify/storefront';

export type WishlistActionResult = {
  success: boolean;
  data?: string[];
  message?: string;
};

/** Generic copy so failures never echo Shopify/GraphQL internals. */
const GENERIC_ERROR = 'Something went wrong. Please try again.';
const UNAUTHENTICATED_ERROR = 'User not authenticated';

/** Throttle wishlist writes, which each trigger an Admin API mutation. Fail closed, and key by IP plus the fingerprinted session token so off-Vercel `unknown`-IP traffic does not share one global bucket. */
const assertNotRateLimited = async (): Promise<boolean> => {
  const [ip, token] = await Promise.all([getClientIp(), getShopifyToken()]);
  return isRateLimited(
    'wishlist:write',
    rateLimitKey(ip, token ? fingerprintForRateLimit(token) : null),
    30,
    '1 m',
    { failClosed: true },
  );
};

/** Cap the client-supplied id list before any validation or fetching. */
const normalizeIds = (productIds: unknown): string[] =>
  Array.isArray(productIds) ? productIds.slice(0, WISHLIST_MAX_ITEMS) : [];

export async function getWishlistIdsAction(): Promise<string[]> {
  try {
    return await getWishlistIdsCached();
  } catch (error) {
    reportError('getWishlistIdsAction', error);
    return [];
  }
}

export async function getWishlistProductsAction(
  productIds: string[],
): Promise<ProductFieldsFragment[]> {
  const ids = normalizeIds(productIds);
  if (ids.length === 0) return [];

  try {
    // `resolveProductsByIds` re-validates every id, so malformed input cannot
    // reach the Storefront API even though this action is unauthenticated.
    return await WishlistService.resolveProductsByIds(ids);
  } catch (error) {
    reportError('getWishlistProductsAction', error);
    return [];
  }
}

/**
 * Add or remove a product from the wishlist.
 *
 * @param isWishlisted whether the product is currently wishlisted:
 * `true` removes it, `false` adds it (mirrors `handleSetWishlist`).
 *
 * Membership and limit rules live in `WishlistService.mutateWishlist`, which
 * re-reads the list inside the customer lock; the only check kept here is the
 * cheap already-in-desired-state fast path that avoids a write entirely.
 */
export async function setWishlistMembershipAction(
  isWishlisted: boolean,
  productId: string,
): Promise<WishlistActionResult> {
  if (!isValidWishlistProductId(productId)) {
    return { success: false, message: 'Invalid product ID' };
  }

  if (await assertNotRateLimited()) {
    return { success: false, message: 'Too many wishlist updates. Please slow down.' };
  }

  try {
    const { customerId, ids } = await WishlistService.getWishlistState();

    if (!customerId) {
      return { success: false, message: UNAUTHENTICATED_ERROR };
    }

    if (isWishlisted ? !ids.includes(productId) : ids.includes(productId)) {
      return {
        success: true,
        data: ids,
        message: isWishlisted
          ? 'Product already removed from wishlist'
          : 'Product already in wishlist',
      };
    }

    // Re-read the current list and apply the change in a single write so a
    // concurrent add/remove is merged instead of being overwritten.
    const result = await WishlistService.mutateWishlist(
      { action: isWishlisted ? 'remove' : 'add', productId },
      customerId,
    );

    if (!result.success) {
      return { success: false, message: result.message || GENERIC_ERROR };
    }

    // Read-your-own-writes: expire the cached ids so the header/UI reflect the change.
    updateTag(WISHLIST_TAG);

    return {
      success: true,
      data: result.data,
      message: isWishlisted ? 'Product removed from wishlist' : 'Product added to wishlist',
    };
  } catch (error) {
    reportError('setWishlistMembershipAction', error);
    return { success: false, message: GENERIC_ERROR };
  }
}
