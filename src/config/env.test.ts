import { getContactMailEnv, validateEnv } from './env';

import { afterEach, describe, expect, it, vi } from 'vitest';

const validEnv = {
  NEXT_PUBLIC_BASE_URL: 'https://shop.example.com',
  NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL: 'https://shop.example.com/api/2026-07/graphql.json',
  SHOPIFY_STORE_FRONT_ACCESS_TOKEN: 'storefront-token',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'upstash-rest-token',
};

const EXAMPLE_STORE_NAME = 'Example Store';
const HELLO_EMAIL = 'hello@example.com';
const SITE_EMAIL = 'site@example.com';

describe('validateEnv', () => {
  it('accepts a minimal storefront-only configuration', () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it('accepts a full configuration including Admin credentials', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        SHOPIFY_ADMIN_URL: 'https://shop.example.com/admin/api/2026-07/graphql.json',
        SHOPIFY_STORE_FRONT_ADMIN_TOKEN: 'admin-token',
      }),
    ).not.toThrow();
  });

  it('throws when a required variable is missing', () => {
    expect(() =>
      validateEnv({
        NEXT_PUBLIC_BASE_URL: validEnv.NEXT_PUBLIC_BASE_URL,
        NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL: validEnv.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL,
      }),
    ).toThrow(/SHOPIFY_STORE_FRONT_ACCESS_TOKEN/);
  });

  it('throws on malformed URLs', () => {
    expect(() => validateEnv({ ...validEnv, NEXT_PUBLIC_BASE_URL: 'not-a-url' })).toThrow(
      /NEXT_PUBLIC_BASE_URL/,
    );
  });

  it('requires Admin URL and token to be provided together', () => {
    expect(() =>
      validateEnv({ ...validEnv, SHOPIFY_ADMIN_URL: 'https://shop.example.com/admin' }),
    ).toThrow(/set together/);
  });

  it('accepts a well-formed GTM container ID', () => {
    expect(() => validateEnv({ ...validEnv, NEXT_PUBLIC_GTM_ID: 'GTM-ABC1234' })).not.toThrow();
  });

  it('rejects a malformed GTM container ID instead of rendering it into a script', () => {
    expect(() => validateEnv({ ...validEnv, NEXT_PUBLIC_GTM_ID: "x');alert(1);//" })).toThrow(
      /NEXT_PUBLIC_GTM_ID/,
    );
  });

  it('accepts optional site metadata overrides', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        NEXT_PUBLIC_SITE_NAME: EXAMPLE_STORE_NAME,
        NEXT_PUBLIC_SITE_EMAIL: HELLO_EMAIL,
        NEXT_PUBLIC_SITE_LOGO: 'https://example.com/images/logo.png',
        NEXT_PUBLIC_SITE_INSTAGRAM: 'https://www.instagram.com/example',
      }),
    ).not.toThrow();
  });

  it('rejects malformed optional site metadata values', () => {
    expect(() => validateEnv({ ...validEnv, NEXT_PUBLIC_SITE_LOGO: 'not-a-url' })).toThrow(
      /NEXT_PUBLIC_SITE_LOGO/,
    );
    expect(() => validateEnv({ ...validEnv, NEXT_PUBLIC_SITE_EMAIL: 'not-an-email' })).toThrow(
      /NEXT_PUBLIC_SITE_EMAIL/,
    );
  });

  it('falls back to a generic path label for top-level issues', () => {
    expect(() => validateEnv(null as unknown as Record<string, string | undefined>)).toThrow(
      /env:/,
    );
  });
});

describe('getContactMailEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the mail settings when configured', () => {
    vi.stubEnv('EMAIL_ADDRESS', SITE_EMAIL);
    vi.stubEnv('EMAIL_PASSWORD', 'secret');
    vi.stubEnv('CONTACT_EMAIL', 'support@example.com');
    vi.stubEnv('NEXT_PUBLIC_SITE_NAME', EXAMPLE_STORE_NAME);

    expect(getContactMailEnv()).toEqual({
      from: SITE_EMAIL,
      pass: 'secret',
      recipient: 'support@example.com',
      siteName: EXAMPLE_STORE_NAME,
    });
  });

  it('falls back to the site email and name when overrides are missing', () => {
    vi.stubEnv('EMAIL_ADDRESS', SITE_EMAIL);
    vi.stubEnv('EMAIL_PASSWORD', 'secret');
    vi.stubEnv('CONTACT_EMAIL', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_EMAIL', HELLO_EMAIL);
    vi.stubEnv('NEXT_PUBLIC_SITE_NAME', '');

    expect(getContactMailEnv()).toMatchObject({
      recipient: HELLO_EMAIL,
      siteName: 'Website',
    });
  });

  it('returns null when mail is unconfigured', () => {
    vi.stubEnv('EMAIL_ADDRESS', '');
    vi.stubEnv('EMAIL_PASSWORD', '');
    vi.stubEnv('CONTACT_EMAIL', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_EMAIL', '');

    expect(getContactMailEnv()).toBeNull();
  });
});
