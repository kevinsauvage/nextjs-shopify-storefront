/**
 * Normalizes a navigation URL coming from Shopify menus into a safe href.
 *
 * Shopify menu URLs are usually relative paths (e.g. `/collections/sale`) but
 * can also be absolute external links. `new URL()` throws on relative input,
 * so we resolve against a placeholder base and return only path + query for
 * same-origin links, leaving external URLs untouched.
 */
const PLACEHOLDER_ORIGIN = 'https://menu.invalid';

export const normalizeMenuHref = (url?: string | null): string => {
  if (!url) return '';

  try {
    const parsed = new URL(url, PLACEHOLDER_ORIGIN);

    if (parsed.origin === PLACEHOLDER_ORIGIN) {
      return `${parsed.pathname}${parsed.search}`;
    }

    return url;
  } catch {
    return url;
  }
};
