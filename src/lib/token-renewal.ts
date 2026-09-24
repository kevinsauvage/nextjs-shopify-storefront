/**
 * Customer access token renewal.
 *
 * Shopify customer tokens expire after a few weeks. Renewal used to happen
 * inside `getShopifyToken`, which runs during server-component render — and
 * `cookies().set()` is not allowed there, so the render would throw whenever a
 * token entered its expiry window. Renewal now happens in `src/proxy.ts`
 * (middleware), where writing cookies is permitted.
 */

const RENEWAL_WINDOW_MS = 5 * 60 * 1000;
// Bound the renewal round-trip so a slow Shopify response cannot hang
// navigation in `src/proxy.ts` (which awaits this on account/auth routes).
const RENEWAL_TIMEOUT_MS = 5_000;

export type RenewedCustomerToken = {
  accessToken: string;
  expiresAt: string;
};

/**
 * True when the stored token is missing, invalid or within the renewal window.
 * A missing expiry is treated as "do not renew" to preserve previous behaviour.
 */
export const shouldRenewToken = (expiresAt?: string | null): boolean => {
  if (!expiresAt) return false;

  const expiry = new Date(expiresAt).getTime();

  return Number.isFinite(expiry) && expiry - RENEWAL_WINDOW_MS <= Date.now();
};

/**
 * True only when the stored token's expiry is in the past, i.e. the token is
 * unusable. Unlike {@link shouldRenewToken} this ignores the renewal window, so
 * callers can tell "needs a refresh" apart from "definitely expired".
 */
export const isTokenExpired = (expiresAt?: string | null): boolean => {
  if (!expiresAt) return false;

  const expiry = new Date(expiresAt).getTime();

  return Number.isFinite(expiry) && expiry <= Date.now();
};

/**
 * Renews a customer access token against the Storefront API. Returns `null` on
 * any failure so callers can degrade gracefully.
 */
export const renewCustomerToken = async (token: string): Promise<RenewedCustomerToken | null> => {
  const url = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL;
  const accessToken = process.env.SHOPIFY_STORE_FRONT_ACCESS_TOKEN;

  if (!url || !accessToken) return null;

  try {
    const response = await fetch(url, {
      body: JSON.stringify({
        query: `mutation RenewCustomerToken($token: String!) {
          customerAccessTokenRenew(customerAccessToken: $token) {
            customerAccessToken {
              accessToken
              expiresAt
            }
            userErrors {
              field
              message
            }
          }
        }`,
        variables: { token },
      }),
      // Never serve a cached renewal and never wait longer than the timeout:
      // callers treat `null` as "could not validate" and fail closed on auth
      // routes, fail open on anonymous catalog requests.
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': accessToken,
      },
      method: 'POST',
      signal: AbortSignal.timeout(RENEWAL_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const json = (await response.json()) as {
      data?: {
        customerAccessTokenRenew?: {
          customerAccessToken?: RenewedCustomerToken | null;
        };
      };
    };

    const renewed = json.data?.customerAccessTokenRenew?.customerAccessToken;

    if (!renewed?.accessToken || !renewed.expiresAt) return null;

    return renewed;
  } catch {
    return null;
  }
};
