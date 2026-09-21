import { storefrontSdk } from '@/shopify';
import type { GetCustomerOrdersQuery } from '@/shopify/storefront';
import { LanguageCode, OrderSortKeys } from '@/shopify/storefront';

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
      language: LanguageCode.En,
      sortKey: OrderSortKeys.ProcessedAt,
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
