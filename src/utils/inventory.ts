/**
 * Shopify returns `quantityAvailable: null` when a variant's inventory is not
 * tracked, which means "no known limit" rather than "none available". When
 * inventory is tracked, `0` means out of stock and must cap the quantity at 0.
 *
 * Returns the numeric purchase cap when the inventory is tracked, otherwise
 * `undefined` so callers can treat the quantity as unlimited.
 */
export const getQuantityCap = (quantityAvailable?: number | null): number | undefined =>
  typeof quantityAvailable === 'number' ? Math.max(0, quantityAvailable) : undefined;
