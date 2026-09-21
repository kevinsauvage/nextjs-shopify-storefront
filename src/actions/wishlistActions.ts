'use server';

import { WISHLIST_MAX_ITEMS, WishlistService } from '@/services/wishlist.service';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { safeLogError } from '@/utils/api-responses';
import { getUser } from '@/utils/users';

export type WishlistActionResult = {
  success: boolean;
  data?: ProductFieldsFragment[];
  message?: string;
};

export async function getWishlistAction(): Promise<ProductFieldsFragment[]> {
  try {
    return await WishlistService.getWishlist();
  } catch (error) {
    safeLogError('getWishlistAction', error);
    return [];
  }
}

export async function addToWishlistAction(productId: string): Promise<WishlistActionResult> {
  if (!productId || typeof productId !== 'string') {
    return { success: false, message: 'Missing or invalid product ID' };
  }

  try {
    await WishlistService.requireAuth();

    const user = await getUser();
    if (!user?.id) {
      return { success: false, message: 'User not found' };
    }

    const currentIds = await WishlistService.getWishlistIds();

    if (currentIds.includes(productId)) {
      return {
        data: await WishlistService.getWishlist(),
        message: 'Product already in wishlist',
        success: true,
      };
    }

    if (currentIds.length >= WISHLIST_MAX_ITEMS) {
      return {
        message: `Wishlist is full. Maximum ${WISHLIST_MAX_ITEMS} items allowed.`,
        success: false,
      };
    }

    const result = await WishlistService.addProduct(productId, user.id);

    if (!result.success) {
      return { message: result.message || "Couldn't add product to wishlist", success: false };
    }

    return {
      data: await WishlistService.getWishlist(),
      message: 'Product added to wishlist',
      success: true,
    };
  } catch (error) {
    safeLogError('addToWishlistAction', error);
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false,
    };
  }
}

export async function removeFromWishlistAction(productId: string): Promise<WishlistActionResult> {
  try {
    await WishlistService.requireAuth();

    const user = await getUser();
    if (!user?.id) {
      return { success: false, message: 'User not found' };
    }

    const result = await WishlistService.removeProduct(productId, user.id);

    if (!result.success) {
      return {
        message: result.message || 'Something went wrong removing the product from the wishlist',
        success: false,
      };
    }

    return {
      data: await WishlistService.getWishlist(),
      message: 'Product removed from wishlist',
      success: true,
    };
  } catch (error) {
    safeLogError('removeFromWishlistAction', error);
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      success: false,
    };
  }
}
