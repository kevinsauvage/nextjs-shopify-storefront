import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
});

// `shopify/index.ts` validates credentials at import time, so every case gets
// a fresh module with its own env.
const load = async () => {
  vi.resetModules();
  return import('./index');
};

const STOREFRONT_URL = 'https://shop.example.com/api/2026-07/graphql.json';

const stubStorefrontEnv = () => {
  vi.stubEnv('SHOPIFY_STORE_FRONT_ACCESS_TOKEN', 'storefront-token');
  vi.stubEnv('NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL', STOREFRONT_URL);
};

describe('storefrontSdk', () => {
  it('throws at import without a Storefront access token', async () => {
    vi.stubEnv('NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL', STOREFRONT_URL);

    await expect(load()).rejects.toThrow('SHOPIFY_STORE_FRONT_ACCESS_TOKEN');
  });

  it('throws at import without a Storefront URL', async () => {
    vi.stubEnv('SHOPIFY_STORE_FRONT_ACCESS_TOKEN', 'storefront-token');

    await expect(load()).rejects.toThrow('NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL');
  });

  it('builds a catalog SDK without network access', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();

    expect(typeof storefrontSdk().predictiveSearch).toBe('function');
  });
});
