/**
 * Shopify returns `quantityAvailable: null` when a variant's inventory is not
 * tracked, which means "no known limit" rather than "none available".
 *
 * Returns the numeric purchase cap when the inventory is tracked, otherwise
 * `undefined` so callers can treat the quantity as unlimited.
 */
export const getQuantityCap = (quantityAvailable?: number | null): number | undefined =>
  typeof quantityAvailable === 'number' && quantityAvailable > 0 ? quantityAvailable : undefined;
