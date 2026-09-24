const NUMERIC_ORDER_ID_PATTERN = /^\d+$/;
const ORDER_GID_PATTERN = /^gid:\/\/shopify\/Order\/(\d+)$/;

/**
 * Build the Storefront global ID for an order from its numeric URL segment.
 * Returns `null` for anything that is not a bare numeric id so junk never
 * reaches the Storefront API.
 */
export const toOrderGid = (orderId: string): string | null => {
  const trimmed = orderId.trim();
  if (!NUMERIC_ORDER_ID_PATTERN.test(trimmed)) return null;
  return `gid://shopify/Order/${trimmed}`;
};

/**
 * Extract the numeric order id from a Storefront global ID for URL building.
 *
 * Shopify appends a `?...` suffix carrying the customer context to some
 * customer-scoped IDs (see `normalizeShopifyGid` in validation utils), so the
 * suffix is stripped before matching — otherwise the detail link silently
 * disappears for suffixed ids.
 */
export const getNumericOrderId = (gid: string | null | undefined): string | null => {
  const match = gid?.split('?')[0]?.match(ORDER_GID_PATTERN);
  return match?.[1] ?? null;
};
