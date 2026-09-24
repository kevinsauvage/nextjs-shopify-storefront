'use client';

import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';

import { CONSENT_UPDATED_EVENT } from '@/lib/client/analytics';
import { getCookieFront } from '@/lib/client/cookies';

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

// Mirrors the `src/config/env.ts` constraint so a malformed ID is never
// interpolated into the inline snippet, even if env validation was skipped.
const rawGtmId = process.env.NEXT_PUBLIC_GTM_ID;
const GTM_ID = rawGtmId && GTM_ID_PATTERN.test(rawGtmId) ? rawGtmId : undefined;

const GtmScript = () => {
  const [hasConsent, setHasConsent] = useState(false);

  const readConsent = useCallback(() => {
    const consentCookie = getCookieFront('localConsent');
    if (!consentCookie) return false;

    try {
      const consent = JSON.parse(consentCookie) as {
        ad_storage?: boolean;
        analytics_storage?: boolean;
      };
      return Boolean(consent.analytics_storage || consent.ad_storage);
    } catch {
      return false;
    }
  }, []);

  /**
   * Consent is read after mount (cookies are not available during SSR) and
   * re-read whenever the cookie banner stores a new choice, so GTM mounts in
   * the same session instead of waiting for a reload.
   */
  useEffect(() => {
    const sync = () => setHasConsent(readConsent());

    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);

    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
  }, [readConsent]);

  return (
    <>
      <Script
        id="gtag-stub"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              analytics_storage: 'denied',
              functionality_storage: 'granted',
              personalization_storage: 'denied',
            });`,
        }}
      />

      {hasConsent && GTM_ID && (
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer', '${GTM_ID}');`,
          }}
        />
      )}
    </>
  );
};

export default GtmScript;
