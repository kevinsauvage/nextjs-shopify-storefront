'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import config from '@/config';
import { dispatchConsentUpdated, withGtag } from '@/lib/client/analytics';
import { getCookieFront, setCookieFront } from '@/lib/client/cookies';
import type { originalSettingsType } from '@/utils/consents';
import { transformedSettings } from '@/utils/consents';

import { Settings } from 'lucide-react';

const EXPIRY_COOKIE_TIME = config.constants.cookieExpiryDays;

const CookieBanner = () => {
  const [show, setShow] = useState<boolean | undefined>(false);

  const setShowBannerCookies = useCallback((payload: boolean) => {
    setShow(payload);
  }, []);

  const handleCookies = useCallback(() => {
    const consent = getCookieFront('localConsent');
    if (consent && typeof consent === 'string') {
      withGtag((gtag) => {
        gtag('consent', 'update', transformedSettings(JSON.parse(consent) as originalSettingsType));
      });
    } else {
      setShow(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external cookie state on mount
    handleCookies();
  }, [handleCookies]);

  const acceptAllCookie = useCallback(() => {
    const cookie = {
      ad_storage: true,
      analytics_storage: true,
      functionality_storage: true,
      personalization_storage: true,
    };
    const transformedObject = transformedSettings(cookie);
    setCookieFront('localConsent', JSON.stringify(cookie), EXPIRY_COOKIE_TIME);
    setShowBannerCookies(false);
    withGtag((gtag) => {
      gtag('consent', 'update', transformedObject);
    });
    dispatchConsentUpdated();
  }, [setShowBannerCookies]);

  const rejectAllCookie = useCallback(() => {
    const cookie = {
      ad_storage: false,
      analytics_storage: false,
      functionality_storage: false,
      personalization_storage: false,
    };
    const transformedObject = transformedSettings(cookie);
    withGtag((gtag) => {
      gtag('consent', 'update', transformedObject);
    });
    setCookieFront('localConsent', JSON.stringify(cookie), EXPIRY_COOKIE_TIME);
    setShowBannerCookies(false);
    dispatchConsentUpdated();
  }, [setShowBannerCookies]);

  const handleSaveSettings = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const target = event.currentTarget;
      const formData = {
        ad_storage: (target.elements.namedItem('ad_storage') as HTMLInputElement).checked,
        analytics_storage: (target.elements.namedItem('analytics_storage') as HTMLInputElement)
          .checked,
        functionality_storage: (
          target.elements.namedItem('functionality_storage') as HTMLInputElement
        ).checked,
        personalization_storage: (
          target.elements.namedItem('personalization_storage') as HTMLInputElement
        ).checked,
      };

      const transformedObject = transformedSettings(formData);

      withGtag((gtag) => {
        gtag('consent', 'update', transformedObject);
      });
      setCookieFront('localConsent', JSON.stringify(formData), EXPIRY_COOKIE_TIME);
      setShowBannerCookies(false);
      dispatchConsentUpdated();
    },
    [setShowBannerCookies],
  );

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background shadow-lg transition-transform duration-300 ease-out"
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
    >
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Content */}
          <div className="flex-1 space-y-2">
            <h3 id="cookie-banner-title" className="text-heading-4">
              We use cookies
            </h3>
            <p id="cookie-banner-description" className="text-body-sm text-secondary">
              We use cookies to enhance your browsing experience and analyze site traffic. By
              clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
              <Link href={config.routes.privacy} className="link">
                Learn more
              </Link>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Primary Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={rejectAllCookie}
                className="flex-1 sm:flex-initial"
              >
                Reject All
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={acceptAllCookie}
                className="flex-1 sm:flex-initial"
              >
                Accept All
              </Button>
            </div>

            {/* Secondary Action - Cookie Settings */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-heading-3">Cookie Settings</DialogTitle>
                  <DialogDescription className="text-body-sm text-secondary">
                    Choose which cookies you want to allow. You can change these settings at any
                    time.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Cookie Information */}
                  <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="text-body font-semibold mb-1">
                            Strictly Necessary Cookies
                          </h4>
                          <p className="text-body-sm text-secondary">
                            Essential for the website to function. Cannot be disabled.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="text-body font-semibold mb-1">Analytics Cookies</h4>
                          <p className="text-body-sm text-secondary">
                            Help us understand how visitors interact with our website.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="text-body font-semibold mb-1">Personalization Cookies</h4>
                          <p className="text-body-sm text-secondary">
                            Remember your preferences and provide personalized content.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="text-body font-semibold mb-1">Advertising Cookies</h4>
                          <p className="text-body-sm text-secondary">
                            Used to deliver relevant advertisements and measure campaign
                            effectiveness.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cookie Preferences Form */}
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="functionality_storage"
                          name="functionality_storage"
                          defaultChecked
                          disabled
                        />
                        <Label
                          htmlFor="functionality_storage"
                          className="text-body-sm cursor-not-allowed opacity-60"
                        >
                          Strictly Necessary Cookies
                          <span className="text-caption-sm text-muted ml-1">(Required)</span>
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox id="analytics_storage" name="analytics_storage" defaultChecked />
                        <Label htmlFor="analytics_storage" className="text-body-sm cursor-pointer">
                          Analytics Cookies
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="personalization_storage"
                          name="personalization_storage"
                          defaultChecked
                        />
                        <Label
                          htmlFor="personalization_storage"
                          className="text-body-sm cursor-pointer"
                        >
                          Personalization Cookies
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox id="ad_storage" name="ad_storage" defaultChecked />
                        <Label htmlFor="ad_storage" className="text-body-sm cursor-pointer">
                          Advertising Cookies
                        </Label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button type="submit" className="flex-1">
                        Save Preferences
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
