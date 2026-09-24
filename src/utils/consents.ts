export type originalSettingsType = {
  ad_storage: boolean;
  analytics_storage: boolean;
  functionality_storage: boolean;
  personalization_storage: boolean;
};

type ConsentStatus = 'granted' | 'denied';

type transformedSettingsType = Record<keyof originalSettingsType, ConsentStatus>;

const toConsentStatus = (value: boolean): ConsentStatus => (value ? 'granted' : 'denied');

export const transformedSettings = (
  originalObject: originalSettingsType,
): transformedSettingsType => ({
  ad_storage: toConsentStatus(originalObject.ad_storage),
  analytics_storage: toConsentStatus(originalObject.analytics_storage),
  functionality_storage: toConsentStatus(originalObject.functionality_storage),
  personalization_storage: toConsentStatus(originalObject.personalization_storage),
});
