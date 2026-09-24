/**
 * Normalizes a navigation URL coming from Shopify menus into a safe href.
 *
 * Shopify menu URLs are usually relative paths (e.g. `/collections/sale`), but
 * they can also be stored as absolute links to the Shopify store domain (e.g.
 * `https://your-store.myshopify.com/collections/sale`). On a headless storefront
 * those links send users to Shopify's password-protected domain, so any URL on
 * a store-owned origin is rewritten to a relative path that keeps the user on
 * the custom storefront. Genuinely external URLs on safe protocols
 * (`http:`, `https:`, `mailto:`, `tel:`) are left untouched; anything else
 * (`javascript:`, `data:`, unparseable) normalizes to `''`.
 */
import type { Route } from 'next';

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
  [
    parseOrigin(process.env.NEXT_PUBLIC_BASE_URL),
    parseOrigin(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL),
  ].filter((origin): origin is string => Boolean(origin)),
);

const isShopifyHost = (hostname: string): boolean =>
  hostname === 'myshopify.com' || hostname.endsWith('.myshopify.com');

const isInternalOrigin = (origin: string, hostname: string): boolean =>
  internalOrigins.has(origin) || isShopifyHost(hostname);

/** Navigation protocols a CMS menu value is allowed to keep. Anything else
 * (`javascript:`, `data:`, `vbscript:`, …) normalizes to `''` so it can never
 * reach a `<Link href>`. `new URL` resolves those schemes as absolute URLs
 * against the placeholder base, so the check must run after parsing. */
const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export const normalizeMenuHref = (url?: string | null): Route => {
  if (!url) return '' as Route;

  const trimmed = url.trim();
  if (!trimmed) return '' as Route;

  try {
    const parsed = new URL(trimmed, PLACEHOLDER_ORIGIN);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    // Relative URL - already internal.
    if (parsed.origin === PLACEHOLDER_ORIGIN) {
      // CMS-driven URLs cannot be statically verified against the route
      // manifest, so the single assertion lives here instead of at every
      // `Link` call site. Absolute URLs with a protocol and statically
      // known shapes still satisfy `Route` at runtime.
      return path as Route;
    }

    // Absolute store URL - strip the origin so navigation stays on this site.
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      isInternalOrigin(parsed.origin, parsed.hostname)
    ) {
      return path as Route;
    }

    // Genuinely external URL: only safe navigation protocols pass through.
    // Anything else (e.g. `javascript:`, `data:`) is rejected even though
    // merchants, not end users, author menu values.
    if (EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return trimmed as Route;
    }

    return '' as Route;
  } catch {
    return '' as Route;
  }
};

/**
 * Returns a same-origin relative path, or `fallback` when the value is not one.
 *
 * Rejects absolute URLs, protocol-relative (`//host`) and backslash
 * (`/\host`) values so a `?redirect=` query cannot bounce an authenticated
 * user off-site.
 */
export const safeInternalPath = (value: string | null | undefined, fallback: Route): Route => {
  if (value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
    return value as Route;
  }

  return fallback;
};

export const RESET_URL_MAX_LENGTH = 2048;

/**
 * True only when `value` is an `https:` URL on a store-owned origin, i.e. a
 * plausible Shopify password-reset link.
 *
 * The reset page builds its `resetUrl` from `?reset_url=` + `?syclid=` query
 * params and the reset action forwards it to `customerResetByUrl`, so an
 * attacker-controlled value must never reach Shopify: it would let a crafted
 * link drive the victim's reset flow (or leak the flow to a lookalike host).
 * Both layers share this check so validation cannot be skipped from either.
 */
export const isAllowedPasswordResetUrl = (value: string | null | undefined): boolean => {
  if (!value || value.length > RESET_URL_MAX_LENGTH) return false;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;

  return isInternalOrigin(parsed.origin, parsed.hostname);
};

/**
 * Appends query parameters to a known route. Centralizes the single `Route`
 * assertion for programmatically built URLs (filters, sort, pagination) so
 * `typedRoutes` stays enabled without an `as Route` at every call site.
 */
export const withQuery = (pathname: string, parameters: URLSearchParams): Route =>
  `${pathname}?${parameters.toString()}` as Route;
