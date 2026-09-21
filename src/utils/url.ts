/**
 * Normalizes a navigation URL coming from Shopify menus into a safe href.
 *
 * Shopify menu URLs are usually relative paths (e.g. `/collections/sale`), but
 * they can also be stored as absolute links to the Shopify store domain (e.g.
 * `https://your-store.myshopify.com/collections/sale`). On a headless storefront
 * those links send users to Shopify's password-protected domain, so any URL on
 * a store-owned origin is rewritten to a relative path that keeps the user on
 * the custom storefront. Genuinely external URLs are left untouched.
 */
const PLACEHOLDER_ORIGIN = 'https://menu.invalid';

const parseOrigin = (value?: string | null): string | null => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/** Origins owned by this storefront that must never be linked to directly. */
const internalOrigins = new Set(
  [parseOrigin(process.env.NEXT_PUBLIC_BASE_URL), parseOrigin(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL)].filter(
    (origin): origin is string => Boolean(origin),
  ),
);

const isShopifyHost = (hostname: string): boolean =>
  hostname === 'myshopify.com' || hostname.endsWith('.myshopify.com');

const isInternalOrigin = (origin: string, hostname: string): boolean =>
  internalOrigins.has(origin) || isShopifyHost(hostname);

export const normalizeMenuHref = (url?: string | null): string => {
  if (!url) return '';

  try {
    const parsed = new URL(url, PLACEHOLDER_ORIGIN);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    // Relative URL - already internal.
    if (parsed.origin === PLACEHOLDER_ORIGIN) {
      return path;
    }

    // Absolute store URL - strip the origin so navigation stays on this site.
    if (isInternalOrigin(parsed.origin, parsed.hostname)) {
      return path;
    }

    return url;
  } catch {
    return url;
  }
};

/**
 * Returns a same-origin relative path, or `fallback` when the value is not one.
 *
 * Rejects absolute URLs, protocol-relative (`//host`) and backslash
 * (`/\host`) values so a `?redirect=` query cannot bounce an authenticated
 * user off-site.
 */
export const safeInternalPath = (value: string | null | undefined, fallback: string): string => {
  if (value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
    return value;
  }

  return fallback;
};
