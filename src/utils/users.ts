import { cache } from 'react';

import { reportError } from '@/lib/logger';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { storefrontSdk } from '@/shopify';

/**
 * Resolve the current customer. Memoized per request so repeated calls within
 * the same render/action don't re-fetch the customer from Shopify.
 *
 * This runs during server-component render, where `cookies().set()`/`delete()`
 * throw. It therefore never mutates the session: a missing or rejected token
 * resolves to `null` and callers redirect to login. Stale tokens are cleared in
 * `src/proxy.ts`, which is allowed to write cookies.
 */
export const getUser = cache(async () => {
  const customerAccessToken = await getShopifyToken();

  if (!customerAccessToken) return null;

  try {
    const response = await storefrontSdk('private').getCustomer({
      customerAccessToken,
      metafields: [],
    });

    return response?.customer ?? null;
  } catch (error) {
    reportError('getUser', error);
    return null;
  }
});
