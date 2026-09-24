'use client';

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'consent' | 'set' | 'js',
      targetIdOrEventName: string,
      configOrParams?: Record<string, unknown>,
    ) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * Safely executes a gtag callback when gtag is available. Used for consent
 * updates; GTM events are pushed to the dataLayer by GTM itself.
 */
export const withGtag = (callback: (gtag: NonNullable<Window['gtag']>) => void): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    callback(window.gtag);
  }
};

/** Fired after the visitor updates their cookie consent. */
export const CONSENT_UPDATED_EVENT = 'localConsentUpdated';

/**
 * Notifies listeners (notably `GtmScript`) that the stored consent changed, so
 * listeners that mounted before the visitor made a choice can re-evaluate.
 */
export const dispatchConsentUpdated = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
  }
};

/**
 * Push a GA4-style `search` event onto the GTM dataLayer.
 *
 * `dataLayer` is created by the GTM stub during `beforeInteractive`, so pushing
 * here is a no-op when GTM is absent and is buffered (not lost) when consent
 * arrives later. Callers must not include PII beyond the search term.
 */
export const trackSearch = ({
  searchTerm,
  resultsCount,
}: {
  searchTerm: string;
  resultsCount?: number;
}): void => {
  if (typeof window === 'undefined') return;

  const payload: Record<string, unknown> = { event: 'search', search_term: searchTerm };

  if (typeof resultsCount === 'number') {
    payload.results_count = resultsCount;
  }

  (window.dataLayer ??= []).push(payload);
};
