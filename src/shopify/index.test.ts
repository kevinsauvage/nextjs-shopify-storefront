import type { SdkFunctionWrapper } from './storefront/index';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildExtraHeaders: vi.fn(async (): Promise<Record<string, string>> => ({})),
  clients: [] as Array<{ options: unknown; url: string }>,
  getSdk: vi.fn(),
  GraphQLClient: vi.fn(),
  reportError: vi.fn(),
  sdkCalls: [] as Array<{ client: unknown; wrapper: SdkFunctionWrapper }>,
}));

vi.mock('@/lib/logger', () => ({ reportError: mocks.reportError }));
vi.mock('./helpers', () => ({ buildExtraHeaders: mocks.buildExtraHeaders }));
vi.mock('graphql-request', () => ({ GraphQLClient: mocks.GraphQLClient }));
vi.mock('./storefront/index', () => ({ getSdk: mocks.getSdk }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  mocks.clients.length = 0;
  mocks.sdkCalls.length = 0;
  mocks.buildExtraHeaders.mockReset();
  mocks.buildExtraHeaders.mockResolvedValue({});
  mocks.reportError.mockReset();
  mocks.getSdk.mockReset();
  mocks.getSdk.mockImplementation((client: unknown, wrapper: SdkFunctionWrapper) => {
    mocks.sdkCalls.push({ client, wrapper });
    return { predictiveSearch: vi.fn() };
  });
  mocks.GraphQLClient.mockReset();
  mocks.GraphQLClient.mockImplementation((url: string, options: unknown) => {
    mocks.clients.push({ options, url });
    return { options, url };
  });
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

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

const clientFetch = (index: number): FetchFn => {
  const options = mocks.clients[index]?.options as { fetch: FetchFn };
  return options.fetch;
};

const lastWrapper = (): SdkFunctionWrapper => {
  const entry = mocks.sdkCalls[mocks.sdkCalls.length - 1];
  if (!entry) throw new Error('expected getSdk to have been called');
  return entry.wrapper;
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

  it('caches public reads under the shopify tag', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();
    storefrontSdk('public');

    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => ({ ok: true }) as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await clientFetch(0)('https://shop.example.com', { method: 'POST' });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as unknown as RequestInit & {
      next?: { revalidate: number; tags: string[] };
    };
    expect(init.next).toEqual({ revalidate: 600, tags: ['shopify'] });
    expect(init.cache).toBeUndefined();
  });

  it('bypasses the cache for private reads', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();
    storefrontSdk('private');

    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => ({ ok: true }) as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    await clientFetch(mocks.clients.length - 1)('https://shop.example.com', { method: 'POST' });

    const init = fetchMock.mock.calls[0]?.[1] as unknown as RequestInit & {
      next?: { revalidate: number };
    };
    expect(init.cache).toBe('no-store');
    expect(init.next).toEqual({ revalidate: 0 });
  });

  it('throws when the Shopify fetch is not ok', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();
    storefrontSdk();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, statusText: 'Bad' }) as Response),
    );

    await expect(clientFetch(0)('https://shop.example.com', {})).rejects.toThrow(
      'Failed to fetch from Shopify: Bad',
    );
  });

  it('publicWrapper returns the action result without logging', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();
    storefrontSdk('public');
    const wrapper = lastWrapper();

    await expect(wrapper(async () => 'ok', 'Op', 'query', { q: 'shoes' })).resolves.toBe('ok');
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it('publicWrapper redacts sensitive variables on failure', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();
    storefrontSdk('public');
    const wrapper = lastWrapper();

    const variables = {
      count: 2,
      empty: null,
      list: [{ secret: 'x', ok: 1 }],
      nested: { normal: 'hi', token: 'abc' },
      password: 'hunter2',
    };

    await expect(
      wrapper(
        async () => {
          throw new Error('boom');
        },
        'PredictiveSearch',
        'query',
        variables,
      ),
    ).rejects.toThrow('boom');

    expect(mocks.reportError).toHaveBeenCalledTimes(1);
    const [message, details] = mocks.reportError.mock.calls[0] as [
      string,
      { error: string; operationType: string; variables: Record<string, unknown> },
    ];
    expect(message).toBe('GraphQL request - PredictiveSearch');
    expect(details.operationType).toBe('query');
    expect(details.error).toBe('boom');
    expect(details.variables).toEqual({
      count: 2,
      empty: null,
      list: [{ secret: '[REDACTED]', ok: 1 }],
      nested: { normal: 'hi', token: '[REDACTED]' },
      password: '[REDACTED]',
    });
  });

  it('publicWrapper stringifies non-error failures and handles missing variables', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();
    storefrontSdk('public');
    const wrapper = lastWrapper();

    await expect(
      wrapper(
        () => Promise.reject(42 as unknown as Error),
        'Op',
        undefined,
        undefined as unknown as Record<string, unknown>,
      ),
    ).rejects.toBe(42);

    const [, details] = mocks.reportError.mock.calls[0] as [
      string,
      { error: string; variables: unknown },
    ];
    expect(details.error).toBe('42');
    expect(details.variables).toBeUndefined();
  });

  it('privateWrapper forwards extra headers to the action', async () => {
    stubStorefrontEnv();
    mocks.buildExtraHeaders.mockResolvedValue({ 'Shopify-Storefront-Buyer-IP': '1.2.3.4' });
    const { storefrontSdk } = await load();
    storefrontSdk('private');
    const wrapper = lastWrapper();
    const action = vi.fn(async (headers?: Record<string, string>) => headers);

    const result = await wrapper(action, 'Op', 'mutation', { id: '1' });

    expect(mocks.buildExtraHeaders).toHaveBeenCalledWith({});
    expect(action).toHaveBeenCalledWith({ 'Shopify-Storefront-Buyer-IP': '1.2.3.4' });
    expect(result).toEqual({ 'Shopify-Storefront-Buyer-IP': '1.2.3.4' });
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it('privateWrapper logs failures with redacted resetUrl keys', async () => {
    stubStorefrontEnv();
    mocks.buildExtraHeaders.mockResolvedValue({});
    const { storefrontSdk } = await load();
    storefrontSdk('private');
    const wrapper = lastWrapper();

    await expect(
      wrapper(
        async () => {
          throw new Error('private-boom');
        },
        'CustomerReset',
        'mutation',
        { resetUrl: 'https://shop.example.com/reset', authorization: 'Bearer x' },
      ),
    ).rejects.toThrow('private-boom');

    const [, details] = mocks.reportError.mock.calls[0] as [
      string,
      { variables: Record<string, unknown> },
    ];
    expect(details.variables).toEqual({
      authorization: '[REDACTED]',
      resetUrl: '[REDACTED]',
    });
  });

  it('selects the private client and wrapper for private mode', async () => {
    stubStorefrontEnv();
    const { storefrontSdk } = await load();

    storefrontSdk('public');
    const publicClient = mocks.sdkCalls[0]?.client;
    const publicWrapper = mocks.sdkCalls[0]?.wrapper;

    storefrontSdk('private');
    const privateClient = mocks.sdkCalls[1]?.client;
    const privateWrapper = mocks.sdkCalls[1]?.wrapper;

    expect(mocks.clients).toHaveLength(2);
    expect(privateClient).not.toBe(publicClient);
    expect(privateWrapper).not.toBe(publicWrapper);
  });
});
