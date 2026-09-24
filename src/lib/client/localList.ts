/**
 * Device-local, ordered string lists (recently viewed products, recent search
 * terms). All helpers are SSR-safe: they no-op without `window`, and swallow
 * quota/private-mode failures so a full or blocked storage never breaks the UI.
 */

/** Read a JSON string array, dropping malformed entries and capping the length. */
export const readLocalList = (key: string, max: number): string[] => {
  if (typeof window === 'undefined') return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');

    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, max)
      : [];
  } catch {
    // Corrupt storage: behave as if nothing was remembered.
    return [];
  }
};

/** Fired in the current tab whenever a local list is written (see `useLocalList`). */
export const LOCAL_LIST_CHANGED_EVENT = 'local-list-changed';

export const writeLocalList = (key: string, values: string[]): void => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Quota exceeded / private mode: the caller's action still succeeded.
  }

  window.dispatchEvent(new Event(LOCAL_LIST_CHANGED_EVENT));
};

/**
 * Subscribe to local-list changes from this tab (custom event) and other tabs
 * (`storage`). Powers `useLocalList` so reads stay in sync without effects.
 */
export const subscribeLocalList = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = () => onChange();

  window.addEventListener(LOCAL_LIST_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(LOCAL_LIST_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
};

/**
 * Return `value` prepended to `list`, de-duplicated case-insensitively and
 * capped at `max`. Blank values leave the list untouched (apart from the cap).
 */
export const prependUnique = (list: string[], value: string, max: number): string[] => {
  const normalized = value.trim();

  if (!normalized) return list.slice(0, max);

  const lower = normalized.toLowerCase();

  return [normalized, ...list.filter((entry) => entry.toLowerCase() !== lower)].slice(0, max);
};
