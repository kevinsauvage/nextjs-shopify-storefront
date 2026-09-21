'use server';

import { WISHLIST_MAX_ITEMS, WishlistService } from '@/services/wishlist.service';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { safeLogError } from '@/utils/api-responses';

export type WishlistActionResult = {
  success: boolean;
  data?: string[];
  message?: string;
};

export async function getWishlistIdsAction(): Promise<string[]> {
  try {
    return await WishlistService.getWishlistIds();
  } catch (error) {
    safeLogError('getWishlistIdsAction', error);
    return [];
  }
}

export async function getWishlistProductsAction(
  productIds: string[],
): Promise<ProductFieldsFragment[]> {
  if (!Array.isArray(productIds) || productIds.length === 0) return [];

  try {
    return await WishlistService.resolveProductsByIds(productIds);
  } catch (error) {
    safeLogError('getWishlistProductsAction', error);
    return [];
  }
}

export async function addToWishlistAction(productId: string): Promise<WishlistActionResult> {
  if (!productId || typeof productId !== 'string') {
    return { success: false, message: 'Missing or invalid product ID' };
  }

  try {
    const { customerId, ids } = await WishlistService.getWishlistState();

    if (!customerId) {
      return { success: false, message: 'User not authenticated' };
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

    const result = await WishlistService.updateWishlist([...ids, productId], customerId);

    if (!result.success) {
      return { success: false, message: result.message || "Couldn't add product to wishlist" };
    }

    return { success: true, data: result.data, message: 'Product added to wishlist' };
  } catch (error) {
    safeLogError('addToWishlistAction', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

export async function removeFromWishlistAction(productId: string): Promise<WishlistActionResult> {
  try {
    const { customerId, ids } = await WishlistService.getWishlistState();

    if (!customerId) {
      return { success: false, message: 'User not authenticated' };
    }

    if (!ids.includes(productId)) {
      return { success: false, message: 'Product not found in wishlist' };
    }

    const result = await WishlistService.updateWishlist(
      ids.filter((id) => id !== productId),
      customerId,
    );

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Something went wrong removing the product from the wishlist',
      };
    }

    return { success: true, data: result.data, message: 'Product removed from wishlist' };
  } catch (error) {
    safeLogError('removeFromWishlistAction', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
