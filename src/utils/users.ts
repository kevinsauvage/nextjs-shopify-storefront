import { cache } from 'react';

import { clearShopifyToken, getShopifyToken } from '@/lib/server/shopify-helpers';
import { storefrontSdk } from '@/shopify';
import { safeLogError } from '@/utils/api-responses';

/**
 * Resolve the current customer. Memoized per request so repeated calls within
 * the same render/action don't re-fetch the customer from Shopify.
 */
export const getUser = cache(async () => {
  const customerAccessToken = await getShopifyToken();

  if (!customerAccessToken) return;

  try {
    const response = await storefrontSdk('private').getCustomer({
      customerAccessToken,
      metafields: [],
    });

    if (!response?.customer) {
      await clearShopifyToken();
      return;
    }

    return response.customer;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Unauthorized') || error.message.includes('401'))
    ) {
      await clearShopifyToken();
    }
    safeLogError('getUser', error);
    return null;
  }
});
