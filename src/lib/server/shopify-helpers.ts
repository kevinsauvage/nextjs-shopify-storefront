import { cookies } from 'next/headers';

import config from '@/config';
import { storefrontSdk } from '@/shopify';
import type { CustomerAccessToken } from '@/shopify/storefront';
import { safeLogError } from '@/utils/api-responses';
import { getSecureCookieOptions } from '@/utils/cookie-security';

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

const isTokenExpiredOrExpiringSoon = (expiresAt: string): boolean => {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return expiryDate <= fiveMinutesFromNow;
};

const renewTokenIfNeeded = async (token: string): Promise<CustomerAccessToken | null> => {
  try {
    const response = await storefrontSdk('no-store').customerAccessTokenRenew({
      customerAccessToken: token,
    });

    const { customerAccessToken, userErrors } = response?.customerAccessTokenRenew || {};

    if (userErrors && userErrors.length > 0) {
      safeLogError('renewTokenIfNeeded - user errors', userErrors);
      return null;
    }

    if (customerAccessToken) {
      await setShopifyToken(customerAccessToken);
      return customerAccessToken;
    }

    return null;
  } catch (error) {
    safeLogError('renewTokenIfNeeded', error);
    return null;
  }
};

export const getShopifyToken = async (): Promise<
  CustomerAccessToken['accessToken'] | undefined
> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(config.cookies.shopifyToken)?.value;
  const expiresAt = cookieStore.get(config.cookies.shopifyTokenExpire)?.value;

  if (!token) return undefined;

  if (expiresAt && isTokenExpiredOrExpiringSoon(expiresAt)) {
    const renewedToken = await renewTokenIfNeeded(token);
    return renewedToken?.accessToken;
  }

  return token;
};

export const clearShopifyToken = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(config.cookies.shopifyToken);
  cookieStore.delete(config.cookies.shopifyTokenExpire);
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

export const getShopifyCartId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(config.cookies.cartId)?.value;
};

