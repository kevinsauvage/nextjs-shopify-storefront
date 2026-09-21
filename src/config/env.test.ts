import { validateEnv } from './env';

import { describe, expect, it } from 'vitest';

const validEnv = {
  NEXT_PUBLIC_BASE_URL: 'https://shop.example.com',
  NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL: 'https://shop.example.com/api/2025-01/graphql.json',
  SHOPIFY_STORE_FRONT_ACCESS_TOKEN: 'storefront-token',
};

describe('validateEnv', () => {
  it('accepts a minimal storefront-only configuration', () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it('accepts a full configuration including Admin credentials', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        SHOPIFY_ADMIN_URL: 'https://shop.example.com/admin/api/2025-01/graphql.json',
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
});
