import 'server-only';

import { storefrontSdk } from '@/shopify';
import type { GetCustomerOrdersQuery, OrderFieldsFragment } from '@/shopify/storefront';
import { toOrderGid } from '@/utils/order';

export type AccountStats = {
  addressesCount: number;
  ordersCount: number;
  recentOrders: NonNullable<GetCustomerOrdersQuery['customer']>['orders']['edges'];
};

/**
 * Loads the account dashboard stats with one request per resource. Recent orders
 * are fetched once and the total order count is derived from the same response.
 */
export const getAccountStats = async (customerAccessToken: string): Promise<AccountStats> => {
  const [ordersResponse, addressesResponse] = await Promise.all([
    storefrontSdk('private').getCustomerOrders({
      customerAccessToken,
      first: 3,
      identifiers: [],
      language: 'EN',
      reverse: true,
      sortKey: 'PROCESSED_AT',
    }),
    storefrontSdk('private').getCustomerAddresses({
      customerAccessToken,
      first: 100,
    }),
  ]);

  return {
    addressesCount: addressesResponse?.customer?.addresses?.edges?.length || 0,
    ordersCount: Number(ordersResponse?.customer?.orders?.totalCount || 0),
    recentOrders: ordersResponse?.customer?.orders?.edges || [],
  };
};

/**
 * Load a single order belonging to the signed-in customer.
 *
 * The Storefront API has no direct order-by-id query, so the customer's
 * recent orders are fetched once and matched by global ID. Orders older than
 * the lookup window (100) are treated as not found.
 */
export const getOrderById = async (
  customerAccessToken: string,
  orderId: string,
): Promise<OrderFieldsFragment | null> => {
  const gid = toOrderGid(orderId);

  if (!gid) return null;

  const response = await storefrontSdk('private').getCustomerOrders({
    customerAccessToken,
    first: 100,
    identifiers: [],
    language: 'EN',
    reverse: true,
    sortKey: 'PROCESSED_AT',
  });

  const edges = response?.customer?.orders?.edges ?? [];
  // Compare suffix-stripped ids: Shopify may append a `?...` customer context
  // suffix to the global ID (see `getNumericOrderId`).
  return edges.find((edge) => edge.node.id.split('?')[0] === gid)?.node ?? null;
};
