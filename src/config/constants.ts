export const COOKIES = {
  cartId: 'x-cart-id',
  // Readable (non-httpOnly) markers so client providers can skip the
  // cart/session server action entirely when no cookie-backed state exists.
  // They hold no secret, only presence, and are cleared with their source cookie.
  cartPresent: 'x-has-cart',
  sessionPresent: 'x-has-session',
  shopifyToken: 'shopify-storefront-access-token',
  shopifyTokenExpire: 'shopify-access-token-expire',
};

export const DEFAULTS = {
  carrier: 'Unknown Carrier',
  ip: 'Unknown',
  link: 'No Link',
  na: 'N/A',
  trackingNumber: 'No Tracking Number',
};
