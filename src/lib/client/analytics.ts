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
