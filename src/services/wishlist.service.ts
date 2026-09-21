import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { adminSdk, storefrontSdk } from '@/shopify';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { safeLogError } from '@/utils/api-responses';

export const WISHLIST_MAX_ITEMS = 100;

const WISHLIST_METAFIELD = { key: 'wishlist', namespace: 'custom' } as const;

export type WishlistState = {
  customerId: string | null;
  ids: string[];
};

const parseWishlistValue = (value?: string | null): string[] => {
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    safeLogError('WishlistService - parse error', error);
    return [];
  }
};

/**
 * Wishlist service
 *
 * The wishlist is a `custom.wishlist` JSON metafield on the customer. Storefront
 * customer metafields are read-only, so writes go through the optional Shopify
 * Admin API (`SHOPIFY_ADMIN_URL` + `SHOPIFY_STORE_FRONT_ADMIN_TOKEN`). When the
 * Admin API is not configured, writes fail with a clear message instead of
 * crashing.
 */
export class WishlistService {
  /**
   * Read the wishlist ids and the customer id in a single Storefront request.
   */
  static async getWishlistState(): Promise<WishlistState> {
    const customerAccessToken = await getShopifyToken();

    if (!customerAccessToken) return { customerId: null, ids: [] };

    const response = await storefrontSdk('private').getCustomer({
      customerAccessToken,
      metafields: [WISHLIST_METAFIELD],
    });

    const customer = response?.customer;

    if (!customer) return { customerId: null, ids: [] };

    return { customerId: customer.id, ids: parseWishlistValue(customer.metafields?.[0]?.value) };
  }

  static async getWishlistIds(): Promise<string[]> {
    return (await this.getWishlistState()).ids;
  }

  /**
   * Resolve product IDs to full product fragments.
   */
  static async resolveProductsByIds(productIds: string[]): Promise<ProductFieldsFragment[]> {
    if (productIds.length === 0) return [];

    try {
      const response = await storefrontSdk('private').getProductsByIds({
        ids: productIds,
        identifiers: [],
      });

      if (!response.nodes || response.nodes.length === 0) return [];

      const productMap = new Map(
        response.nodes
          .filter((node) => node !== null && node !== undefined)
          .map((node) => {
            const product = node as unknown as ProductFieldsFragment;
            return [product.id, product] as [string, ProductFieldsFragment];
          }),
      );

      return productIds
        .map((id) => productMap.get(id))
        .filter((product): product is ProductFieldsFragment => product !== undefined);
    } catch (error) {
      safeLogError('WishlistService.resolveProductsByIds', error);
      return [];
    }
  }

  /**
   * Persist the wishlist in a single Admin call. Returns a friendly message when
   * the Admin API is not configured.
   */
  static async updateWishlist(
    productIds: string[],
    customerId: string,
  ): Promise<{ success: boolean; data?: string[]; message?: string }> {
    const uniqueIds = Array.from(new Set(productIds)).slice(0, WISHLIST_MAX_ITEMS);

    let responseMetafield;
    try {
      responseMetafield = await adminSdk().MetafieldsSet({
        metafields: [
          {
            key: WISHLIST_METAFIELD.key,
            namespace: WISHLIST_METAFIELD.namespace,
            ownerId: customerId,
            type: 'json',
            value: JSON.stringify(uniqueIds),
          },
        ],
      });
    } catch (error) {
      safeLogError('WishlistService.updateWishlist - admin unavailable', error);
      return {
        success: false,
        message: 'Wishlist is unavailable: the Shopify Admin API is not configured.',
      };
    }

    const errors = responseMetafield?.metafieldsSet?.userErrors;
    if (errors && errors.length > 0) {
      safeLogError('WishlistService.updateWishlist - MetafieldsSet errors', errors);
      return { success: false, message: 'Something went wrong updating the wishlist' };
    }

    return { success: true, data: uniqueIds };
  }
}
