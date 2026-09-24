const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
  year: 'numeric',
};

/**
 * Formats a date with `Intl.DateTimeFormat`. Returns `fallback` for missing or
 * invalid values so callers do not have to guard every optional timestamp.
 *
 * Formatting is pinned to UTC so the server-rendered markup and the client
 * hydration produce identical strings; otherwise a visitor in a different
 * timezone than the server would see a hydration mismatch. Pass `timeZone` in
 * `options` to opt back into a specific zone.
 */
export const formatDate = (
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
  fallback = 'N/A',
): string => {
  if (value === null || value === undefined || value === '') return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
};

/**
 * Formats a price amount with currency code
 * @param amount - The price amount (string or number)
 * @param currencyCode - The currency code (e.g., 'USD', 'EUR')
 * @returns Formatted price string (e.g., "$12.99" or "€12.99")
 */
/**
 * `true` when a compare-at price exists and is strictly above the sale price.
 * Accepts the Shopify `MoneyV2`-shaped `{ amount }` objects so callers do not
 * repeat the `Number(...)` coercion dance.
 */
export const hasDiscountPrice = (
  price?: { amount: string } | null,
  compareAtPrice?: { amount: string } | null,
): boolean => !!compareAtPrice && !!price && Number(compareAtPrice.amount) > Number(price.amount);

/**
 * Whole-percent discount of `price` relative to `compareAt`
 * (e.g. 80 vs 100 → `'20'`). Callers add the `%` sign/badge styling.
 */
export const discountPercentOf = (price: number | string, compareAt: number | string): string =>
  (((Number(compareAt) - Number(price)) / Number(compareAt)) * 100).toFixed(0);

export const formatPrice = (amount: string | number, currencyCode: string): string => {
  const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
  const numAmount = Number.isFinite(parsed) ? parsed : 0;

  // Use Intl.NumberFormat for proper currency formatting
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(numAmount);
  } catch {
    // Fallback if currency code is invalid
    const formatted = numAmount.toFixed(2);
    return `${currencyCode} ${formatted}`;
  }
};
