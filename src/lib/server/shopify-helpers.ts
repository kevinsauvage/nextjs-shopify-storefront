import { cache } from 'react';
import { cookies } from 'next/headers';

import config from '@/config';
import type { CustomerAccessToken } from '@/shopify/storefront';
import { getCookieDeleteOptions, getSecureCookieOptions } from '@/utils/cookie-security';

/**
 * Shopify token management helpers
 * Server-side utilities for managing Shopify customer access tokens
 */
export const setShopifyToken = async (customerAccessToken: CustomerAccessToken): Promise<void> => {
  if (!customerAccessToken) return;
  const { accessToken, expiresAt } = customerAccessToken || {};
  if (!accessToken || !expiresAt) return;

  const expiresAtDate = new Date(expiresAt as string);

  const cookieStore = await cookies();

  cookieStore.set({
    name: config.cookies.shopifyToken,
    value: accessToken,
    ...getSecureCookieOptions({ expires: expiresAtDate }),
  });

  cookieStore.set({
    name: config.cookies.shopifyTokenExpire,
    value: expiresAtDate.toISOString(),
    ...getSecureCookieOptions({ expires: expiresAtDate }),
  });
};

/**
 * Reads the stored customer access token. This is intentionally read-only:
 * renewal happens in `src/proxy.ts`, because `cookies().set()` is not allowed
 * while rendering server components. Memoized per request.
 */
export const getShopifyToken = cache(
  async (): Promise<CustomerAccessToken['accessToken'] | undefined> => {
    const cookieStore = await cookies();
    return cookieStore.get(config.cookies.shopifyToken)?.value;
  },
);

export const clearShopifyToken = async (): Promise<void> => {
  const cookieStore = await cookies();
  const options = getCookieDeleteOptions();
  cookieStore.delete({ name: config.cookies.shopifyToken, ...options });
  cookieStore.delete({ name: config.cookies.shopifyTokenExpire, ...options });
};

/**
 * Cheap, network-free check for a customer session, based only on the presence
 * of the Shopify token cookie. Use this for UI decisions (e.g. showing
 * "Account" vs "Login") instead of fetching the full customer on every render.
 */
export const hasShopifySession = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(config.cookies.shopifyToken)?.value);
};

