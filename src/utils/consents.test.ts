import { transformedSettings } from './consents';

import { describe, expect, it } from 'vitest';

describe('transformedSettings', () => {
  it('maps consent booleans to granted/denied statuses', () => {
    expect(
      transformedSettings({
        ad_storage: true,
        analytics_storage: false,
        functionality_storage: true,
        personalization_storage: false,
      }),
    ).toEqual({
      ad_storage: 'granted',
      analytics_storage: 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'denied',
    });
  });

  it('denies everything when all storage is rejected', () => {
    expect(
      transformedSettings({
        ad_storage: false,
        analytics_storage: false,
        functionality_storage: false,
        personalization_storage: false,
      }),
    ).toEqual({
      ad_storage: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
    });
  });
});
