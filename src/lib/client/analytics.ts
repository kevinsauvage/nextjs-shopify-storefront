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
