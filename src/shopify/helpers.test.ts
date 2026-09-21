import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));
vi.mock('@/lib/server/delegate-token', () => ({ getDelegateAccessToken: vi.fn(async () => null) }));
vi.mock('@/lib/server/url-helpers', () => ({
  getCurrentUrlWithoutParameters: vi.fn(async () => ''),
}));

import { adjustPaginationVariables, buildShopifySearchQuery, parseFiltersQuery } from './helpers';

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
});
