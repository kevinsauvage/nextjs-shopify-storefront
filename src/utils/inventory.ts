/**
 * Below this tracked quantity a variant counts as "low stock" across cards,
 * PDP and quick-buy badges. Single source of truth so the threshold cannot
 * drift between components.
 */
export const LOW_STOCK_THRESHOLD = 5;

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

/** `true` when Shopify explicitly flags the variant as unavailable. */
export const isSoldOut = (availableForSale?: boolean): boolean => availableForSale === false;

/**
 * `true` when tracked inventory is positive but below the low-stock threshold
 * and the variant is still sellable. Untracked (`null`/`undefined`) inventory
 * means "no known limit", never low stock.
 */
export const isLowStock = (
  quantityAvailable?: number | null,
  availableForSale?: boolean,
): boolean =>
  !isSoldOut(availableForSale) &&
  typeof quantityAvailable === 'number' &&
  quantityAvailable > 0 &&
  quantityAvailable < LOW_STOCK_THRESHOLD;
