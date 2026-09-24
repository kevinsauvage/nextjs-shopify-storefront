import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/client-ip', () => ({
  UNKNOWN_IP: 'unknown',
  getClientIp: vi.fn(async () => 'unknown'),
}));
vi.mock('@/lib/server/delegate-token', () => ({ getDelegateAccessToken: vi.fn(async () => null) }));

import { getClientIp } from '@/lib/server/client-ip';
import { getDelegateAccessToken } from '@/lib/server/delegate-token';

import {
  adjustPaginationVariables,
  buildExtraHeaders,
  buildShopifySearchQuery,
  getNextPath,
  getPreviousPath,
  parseFiltersQuery,
} from './helpers';

describe('adjustPaginationVariables', () => {
  it('defaults to forward pagination', () => {
    expect(adjustPaginationVariables({ first: 10 })).toEqual({
      after: undefined,
      before: undefined,
      first: 10,
      last: undefined,
    });
  });

  it('paginates forward when an after cursor is given', () => {
    expect(adjustPaginationVariables({ after: 'cursor', first: 5 })).toEqual({
      after: 'cursor',
      before: undefined,
      first: 5,
      last: undefined,
    });
  });

  it('paginates backward when a before cursor is given', () => {
    expect(adjustPaginationVariables({ before: 'cursor', first: 5 })).toEqual({
      after: undefined,
      before: 'cursor',
      first: undefined,
      last: 5,
    });
  });

  it('honours an explicit first: 0 instead of defaulting', () => {
    expect(adjustPaginationVariables({ first: 0 })).toEqual({
      after: undefined,
      before: undefined,
      first: 0,
      last: undefined,
    });
  });

  it('defaults the page size when first is missing', () => {
    expect(adjustPaginationVariables({})).toEqual({
      after: undefined,
      before: undefined,
      first: 10,
      last: undefined,
    });
  });
});

describe('buildShopifySearchQuery', () => {
  it('returns an empty string for empty input', () => {
    expect(buildShopifySearchQuery('')).toBe('');
  });

  it('adds a wildcard for single terms', () => {
    expect(buildShopifySearchQuery('shoes')).toBe('shoes*');
  });

  it('quotes multi-word queries', () => {
    expect(buildShopifySearchQuery('red shoes')).toBe('"red shoes"');
  });
});

describe('parseFiltersQuery', () => {
  it('returns an empty array for missing filters', () => {
    expect(parseFiltersQuery(undefined)).toEqual([]);
  });

  it('parses a single filter string', () => {
    expect(parseFiltersQuery('price:{"price":{"min":1}}')).toEqual([{ price: { min: 1 } }]);
  });

  it('parses an array of filter strings and drops malformed entries', () => {
    expect(parseFiltersQuery(['size:{"size":"M"}', 'broken'])).toEqual([{ size: 'M' }]);
  });

  it('does not throw on malformed user-supplied filters', () => {
    expect(parseFiltersQuery('broken')).toEqual([]);
    expect(parseFiltersQuery('price:{not-json}')).toEqual([]);
    expect(parseFiltersQuery(['price:{not-json}', 'size:{"size":"M"}'])).toEqual([{ size: 'M' }]);
    expect(parseFiltersQuery('')).toEqual([]);
  });

  it('drops empty entries inside an array', () => {
    expect(parseFiltersQuery([''])).toEqual([]);
  });

  it('drops non-object JSON payloads', () => {
    expect(parseFiltersQuery('price:123')).toEqual([]);
    expect(parseFiltersQuery('price:null')).toEqual([]);
    expect(parseFiltersQuery('price:"hello"')).toEqual([]);
  });
});

describe('pagination paths (cookie-free)', () => {
  const pageInfo = {
    endCursor: 'end-1',
    hasNextPage: true,
    hasPreviousPage: true,
    startCursor: 'start-1',
  };
  const none = { ...pageInfo, hasNextPage: false, hasPreviousPage: false };

  it('builds the next path from the base path, preserving filters and swapping the cursor', () => {
    const next = new URL(
      getNextPath(pageInfo, { after: 'old', sort_key: 'PRICE' }, '/collections/sale'),
      'http://internal',
    );

    expect(next.pathname).toBe('/collections/sale');
    expect(next.searchParams.get('after')).toBe('end-1');
    expect(next.searchParams.get('sort_key')).toBe('PRICE');
    expect(next.searchParams.has('before')).toBe(false);
  });

  it('builds the previous path and drops the after cursor', () => {
    const previous = new URL(
      getPreviousPath(pageInfo, { after: 'old' }, '/search'),
      'http://internal',
    );

    expect(previous.pathname).toBe('/search');
    expect(previous.searchParams.get('before')).toBe('start-1');
    expect(previous.searchParams.has('after')).toBe(false);
  });

  it('returns an empty string when there is no next or previous page', () => {
    expect(getNextPath(none, {}, '/search')).toBe('');
    expect(getPreviousPath(none, {}, '/search')).toBe('');
  });
});

describe('buildExtraHeaders', () => {
  beforeEach(() => {
    vi.mocked(getClientIp).mockReset();
    vi.mocked(getClientIp).mockResolvedValue('unknown');
    vi.mocked(getDelegateAccessToken).mockReset();
    vi.mocked(getDelegateAccessToken).mockResolvedValue(null);
  });

  it('returns only the content type without request context', async () => {
    await expect(buildExtraHeaders({})).resolves.toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('attaches the buyer IP when a real IP is available', async () => {
    vi.mocked(getClientIp).mockResolvedValue('1.2.3.4');

    await expect(buildExtraHeaders({})).resolves.toEqual({
      'Content-Type': 'application/json',
      'Shopify-Storefront-Buyer-IP': '1.2.3.4',
    });
  });

  it('attaches the delegate token when available', async () => {
    vi.mocked(getDelegateAccessToken).mockResolvedValue('delegate-1');

    await expect(buildExtraHeaders({})).resolves.toEqual({
      'Content-Type': 'application/json',
      'Shopify-Storefront-Private-Token': 'delegate-1',
    });
  });

  it('combines IP, token and caller headers while forcing JSON content type', async () => {
    vi.mocked(getClientIp).mockResolvedValue('1.2.3.4');
    vi.mocked(getDelegateAccessToken).mockResolvedValue('delegate-1');

    await expect(
      buildExtraHeaders({ 'X-Custom': 'yes', 'Content-Type': 'text/plain' }),
    ).resolves.toEqual({
      'Content-Type': 'application/json',
      'Shopify-Storefront-Buyer-IP': '1.2.3.4',
      'Shopify-Storefront-Private-Token': 'delegate-1',
      'X-Custom': 'yes',
    });
  });
});
