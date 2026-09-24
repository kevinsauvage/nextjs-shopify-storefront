import { afterEach, describe, expect, it, vi } from 'vitest';

// `admin-client.ts` reads credentials at import time, so every case gets a
// fresh module with its own env.
const load = async () => {
  vi.resetModules();
  return import('./admin-client');
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getAdminClient', () => {
  it('throws a helpful error when Admin credentials are missing', async () => {
    const { getAdminClient } = await load();

    expect(() => getAdminClient()).toThrow('SHOPIFY_ADMIN_URL');
  });

  it('builds and memoizes the client when configured', async () => {
    vi.stubEnv('SHOPIFY_ADMIN_URL', 'https://shop.example.com/admin/api/graphql.json');
    vi.stubEnv('SHOPIFY_STORE_FRONT_ADMIN_TOKEN', 'admin-token');
    const { getAdminClient } = await load();

    const first = getAdminClient();

    expect(first).toBe(getAdminClient());
    expect(typeof first.request).toBe('function');
  });
});
