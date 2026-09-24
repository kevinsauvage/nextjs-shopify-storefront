'use server';

import { updateTag } from 'next/cache';

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
import { safeLogError } from '@/utils/api-responses';

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
    safeLogError('getWishlistIdsAction', error);
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
    safeLogError('getWishlistProductsAction', error);
    return [];
  }
}

export async function addToWishlistAction(productId: string): Promise<WishlistActionResult> {
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

    if (ids.includes(productId)) {
      return { success: true, data: ids, message: 'Product already in wishlist' };
    }

    if (ids.length >= WISHLIST_MAX_ITEMS) {
      return {
        success: false,
        message: `Wishlist is full. Maximum ${WISHLIST_MAX_ITEMS} items allowed.`,
      };
    }

    // Re-read the current list and apply the change in a single write so a
    // concurrent add/remove is merged instead of being overwritten.
    const result = await WishlistService.mutateWishlist({ action: 'add', productId }, customerId);

    if (!result.success) {
      return { success: false, message: result.message || GENERIC_ERROR };
    }

    // Read-your-own-writes: expire the cached ids so the header/UI reflect the add.
    updateTag(WISHLIST_TAG);

    return { success: true, data: result.data, message: 'Product added to wishlist' };
  } catch (error) {
    safeLogError('addToWishlistAction', error);
    return { success: false, message: GENERIC_ERROR };
  }
}

export async function removeFromWishlistAction(productId: string): Promise<WishlistActionResult> {
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

    if (!ids.includes(productId)) {
      return { success: true, data: ids, message: 'Product already removed from wishlist' };
    }

    const result = await WishlistService.mutateWishlist(
      { action: 'remove', productId },
      customerId,
    );

    if (!result.success) {
      return { success: false, message: result.message || GENERIC_ERROR };
    }

    // Read-your-own-writes: expire the cached ids so the header/UI reflect the removal.
    updateTag(WISHLIST_TAG);

    return { success: true, data: result.data, message: 'Product removed from wishlist' };
  } catch (error) {
    safeLogError('removeFromWishlistAction', error);
    return { success: false, message: GENERIC_ERROR };
  }
}
