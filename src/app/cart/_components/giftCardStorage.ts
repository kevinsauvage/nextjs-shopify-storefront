/**
 * Device-local memory of full gift-card codes, keyed by cart id.
 *
 * Shopify only returns the last characters of applied cards, never the full
 * codes, while `cartGiftCardCodesUpdate` replaces the full set — so the
 * server alone cannot rebuild the list when a second code is added. Codes
 * entered on this device are remembered here; cards applied on another device
 * stay out of the local set and are left untouched unless explicitly replaced.
 */

const storedCodesKey = (cartId: string) => `gift-cards:${cartId}`;

export const readStoredCodes = (cartId: string | undefined): string[] => {
  if (!cartId || typeof window === 'undefined') return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storedCodesKey(cartId)) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    // Corrupt storage or private mode: behave as if nothing was remembered.
    return [];
  }
};

export const writeStoredCodes = (cartId: string, codes: string[]): void => {
  try {
    window.localStorage.setItem(storedCodesKey(cartId), JSON.stringify(codes));
  } catch {
    // Private mode quota: the apply still went through, only the memory is lost.
  }
};

/**
 * Drop a removed card from the local memory, matched by last characters (the
 * only code fragment Shopify returns). A card applied on another device simply
 * has no local entry and is left alone.
 */
export const pruneStoredCode = (
  cartId: string | undefined,
  lastCharacters: string | undefined,
): void => {
  if (!cartId || !lastCharacters) return;

  const remaining = readStoredCodes(cartId).filter((code) => !code.endsWith(lastCharacters));

  writeStoredCodes(cartId, remaining);
};
