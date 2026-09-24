import { afterEach, describe, expect, it, vi } from 'vitest';

const { delegateAccessTokenCreate } = vi.hoisted(() => ({
  delegateAccessTokenCreate: vi.fn(),
}));

vi.mock('@/shopify/admin-client', () => ({
  adminSdk: () => ({ delegateAccessTokenCreate }),
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  delegateAccessTokenCreate.mockReset();
});

const DELEGATE_TOKEN = 'delegate-token-1';

// `delegate-token.ts` reads SHOPIFY_SCOPE and caches aggressively at module
// level, so every case gets a fresh module with its own env.
const load = async () => {
  vi.resetModules();
  return import('./delegate-token');
};

const granted = (accessToken = DELEGATE_TOKEN) =>
  delegateAccessTokenCreate.mockResolvedValue({
    delegateAccessTokenCreate: { delegateAccessToken: { accessToken }, userErrors: [] },
  });

describe('getDelegateAccessToken', () => {
  it('returns null without calling Admin when SHOPIFY_SCOPE is not set', async () => {
    vi.stubEnv('SHOPIFY_SCOPE', '');
    const { getDelegateAccessToken } = await load();

    await expect(getDelegateAccessToken()).resolves.toBeNull();
    expect(delegateAccessTokenCreate).not.toHaveBeenCalled();
  });

  it('creates and caches the token for its lifetime', async () => {
    vi.stubEnv('SHOPIFY_SCOPE', 'read_products');
    granted();
    const { getDelegateAccessToken } = await load();

    await expect(getDelegateAccessToken()).resolves.toBe(DELEGATE_TOKEN);
    await expect(getDelegateAccessToken()).resolves.toBe(DELEGATE_TOKEN);
    expect(delegateAccessTokenCreate).toHaveBeenCalledTimes(1);
  });

  it('single-flights concurrent callers into one Admin request', async () => {
    vi.stubEnv('SHOPIFY_SCOPE', 'read_products');
    granted();
    const { getDelegateAccessToken } = await load();

    const [first, second] = await Promise.all([getDelegateAccessToken(), getDelegateAccessToken()]);

    expect(first).toBe(DELEGATE_TOKEN);
    expect(second).toBe(DELEGATE_TOKEN);
    expect(delegateAccessTokenCreate).toHaveBeenCalledTimes(1);
  });

  it('negative-caches failures instead of hitting Admin on every request', async () => {
    vi.stubEnv('SHOPIFY_SCOPE', 'read_products');
    delegateAccessTokenCreate.mockRejectedValue(new Error('Admin down'));
    const { getDelegateAccessToken } = await load();

    await expect(getDelegateAccessToken()).resolves.toBeNull();
    await expect(getDelegateAccessToken()).resolves.toBeNull();
    expect(delegateAccessTokenCreate).toHaveBeenCalledTimes(1);
  });

  it('returns null when Shopify reports user errors', async () => {
    vi.stubEnv('SHOPIFY_SCOPE', 'read_products');
    delegateAccessTokenCreate.mockResolvedValue({
      delegateAccessTokenCreate: {
        delegateAccessToken: null,
        userErrors: [{ message: 'Scope is invalid' }],
      },
    });
    const { getDelegateAccessToken } = await load();

    await expect(getDelegateAccessToken()).resolves.toBeNull();
  });
});
