import { validateEnv } from './env';

import { describe, expect, it } from 'vitest';

const validEnv = {
  NEXT_PUBLIC_BASE_URL: 'https://shop.example.com',
  NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL: 'https://shop.example.com/api/2026-07/graphql.json',
  SHOPIFY_STORE_FRONT_ACCESS_TOKEN: 'storefront-token',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'upstash-rest-token',
};

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

  it('accepts optional site metadata overrides', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        NEXT_PUBLIC_SITE_NAME: 'Example Store',
        NEXT_PUBLIC_SITE_EMAIL: 'hello@example.com',
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
});
