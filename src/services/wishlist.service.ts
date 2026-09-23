import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { adminSdk, storefrontSdk } from '@/shopify';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { safeLogError } from '@/utils/api-responses';

export const WISHLIST_MAX_ITEMS = 100;

/** Longest a single product GID may be; also caps raw client input. */
export const WISHLIST_MAX_ID_LENGTH = 255;

/** Shopify product global id, e.g. `gid://shopify/Product/1234567890`. */
const PRODUCT_GID_PATTERN = /^gid:\/\/shopify\/Product\/\d+$/;

export const isValidWishlistProductId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= WISHLIST_MAX_ID_LENGTH &&
  PRODUCT_GID_PATTERN.test(value);

const WISHLIST_METAFIELD = { key: 'wishlist', namespace: 'custom' } as const;

/** Cache tag for the customer's wishlist ids. Invalidated with `updateTag`. */
export const WISHLIST_TAG = 'wishlist';

export type WishlistState = {
  customerId: string | null;
  ids: string[];
};

export type WishlistMutation =
  | { action: 'add'; productId: string }
  | { action: 'remove'; productId: string };

/**
 * Per-customer serialization of wishlist writes.
 *
 * The wishlist lives in a single JSON metafield, so two concurrent
 * read-modify-write cycles would otherwise lose one of the updates. Mutations
 * for the same customer are chained so each one reads the value the previous
 * one wrote. Keyed on the customer id, so requests for different customers are
 * unaffected.
 */
const customerQueues = new Map<string, Promise<unknown>>();

const withCustomerLock = <T>(customerId: string, task: () => Promise<T>): Promise<T> => {
  const previous = customerQueues.get(customerId) ?? Promise.resolve();
  // Ignore the predecessor's result/error: this task must run regardless.
  const next = previous.then(task, task);
  const tracked = next.finally(() => {
    if (customerQueues.get(customerId) === tracked) {
      customerQueues.delete(customerId);
    }
  });
  customerQueues.set(customerId, tracked);
  return next;
};

const parseWishlistValue = (value?: string | null): string[] => {
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(isValidWishlistProductId).slice(0, WISHLIST_MAX_ITEMS)
      : [];
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

    // Never forward unvalidated input to the Storefront API: this runs for any
    // caller, so a malformed id must fail here rather than in a GraphQL query.
    const ids = Array.from(new Set(productIds.filter(isValidWishlistProductId))).slice(
      0,
      WISHLIST_MAX_ITEMS,
    );

    if (ids.length === 0) return [];

    try {
      const response = await storefrontSdk('private').getProductsByIds({
        ids,
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

      return ids
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
    const uniqueIds = Array.from(new Set(productIds.filter(isValidWishlistProductId))).slice(
      0,
      WISHLIST_MAX_ITEMS,
    );

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

  /**
   * Apply a single add/remove to the wishlist.
   *
   * The metafield is re-read inside the customer lock, immediately before the
   * write, so the update is applied to the freshest value instead of a list
   * passed in by the caller. Concurrent requests for the same customer are
   * serialized, which prevents lost updates.
   */
  static async mutateWishlist(
    mutation: WishlistMutation,
    customerId: string,
  ): Promise<{ success: boolean; data?: string[]; message?: string }> {
    if (!isValidWishlistProductId(mutation.productId)) {
      return { success: false, message: 'Invalid product ID' };
    }

    return withCustomerLock(customerId, async () => {
      const { customerId: currentCustomerId, ids } = await this.getWishlistState();

      // The session changed (expired/rotated) while queued: do not write.
      if (currentCustomerId !== customerId) {
        return { success: false, message: 'User not authenticated' };
      }

      const alreadyPresent = ids.includes(mutation.productId);

      if (mutation.action === 'add') {
        if (alreadyPresent) return { success: true, data: ids };
        if (ids.length >= WISHLIST_MAX_ITEMS) {
          return {
            success: false,
            message: `Wishlist is full. Maximum ${WISHLIST_MAX_ITEMS} items allowed.`,
          };
        }
      } else if (!alreadyPresent) {
        return { success: true, data: ids };
      }

      const nextIds =
        mutation.action === 'add'
          ? [...ids, mutation.productId]
          : ids.filter((id) => id !== mutation.productId);

      return this.updateWishlist(nextIds, customerId);
    });
  }
}

/**
 * Read-your-own-writes cached wishlist ids for the UI.
 *
 * `use cache: private` may read cookies (the customer token), and
 * `stale: Infinity` keeps the value on the client until a wishlist mutation
 * calls `updateTag(WISHLIST_TAG)` — so ordinary navigations do not re-fetch the
 * wishlist, but the user always sees their own change immediately.
 */
export async function getWishlistIdsCached(): Promise<string[]> {
  'use cache: private';
  cacheLife({ stale: Infinity });
  cacheTag(WISHLIST_TAG);
  return (await WishlistService.getWishlistState()).ids;
}
