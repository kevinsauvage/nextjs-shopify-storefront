'use server';

import { reportError } from '@/lib/logger';
import { getClientIp } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { WISHLIST_MAX_ITEMS, WishlistService } from '@/services/wishlist.service';
import { storefrontSdk } from '@/shopify';
import type { ProductFieldsFragment } from '@/shopify/storefront';

const MAX_BEST_SELLERS = 8;

/**
 * Resolve product IDs to full product fragments for device-local rails
 * (recently viewed). Reuses the wishlist resolver so id validation and the
 * Storefront call stay in one place.
 */
export async function getProductsByIdsAction(
  productIds: string[],
): Promise<ProductFieldsFragment[]> {
  const ids = Array.isArray(productIds) ? productIds.slice(0, WISHLIST_MAX_ITEMS) : [];
  if (ids.length === 0) return [];

  const ip = await getClientIp();
  // Fail open: this is a read-only catalog path, so a limiter outage must
  // degrade to no rail rather than break the page.
  if (await isRateLimited('products:resolve', ip, 60, '1 m')) return [];

  try {
    return await WishlistService.resolveProductsByIds(ids);
  } catch (error) {
    reportError('getProductsByIdsAction', error);
    return [];
  }
}

/**
 * Store best-sellers for empty-state rails (search with no results, empty cart).
 */
export async function getBestSellersAction(
  limit = MAX_BEST_SELLERS,
): Promise<ProductFieldsFragment[]> {
  const first = Math.min(Math.max(1, Math.trunc(limit)), MAX_BEST_SELLERS);

  try {
    const response = await storefrontSdk().getProducts({
      first,
      identifiers: [],
      sortKey: 'BEST_SELLING',
    });

    return (response.products?.edges ?? []).map((edge) => edge.node as ProductFieldsFragment);
  } catch (error) {
    reportError('getBestSellersAction', error);
    return [];
  }
}
