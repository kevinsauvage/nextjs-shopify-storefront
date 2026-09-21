import { NextRequest } from 'next/server';

import { describe, expect, it, vi } from 'vitest';

const { predictiveSearch, rateLimited } = vi.hoisted(() => ({
  predictiveSearch: vi.fn(),
  rateLimited: vi.fn(async () => false),
}));

vi.mock('@/shopify', () => ({ storefrontSdk: () => ({ predictiveSearch }) }));
vi.mock('@/lib/server/client-ip', () => ({ getClientIp: async () => '1.2.3.4' }));
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));

import { GET } from './route';

const request = (query: string) =>
  new NextRequest(`http://localhost/api/search/predictive?q=${encodeURIComponent(query)}`);

describe('GET /api/search/predictive', () => {
  it('returns the payload inside the response envelope the client reads', async () => {
    predictiveSearch.mockResolvedValue({ predictiveSearch: { products: [] } });

    const response = await GET(request('hat'));
    const body = await response.json();

    expect(predictiveSearch).toHaveBeenCalledWith({ query: 'hat' });
    // Client contract: `src/components/Search.tsx` reads `data.data.predictiveSearch`.
    expect(body.data.predictiveSearch).toEqual({ products: [] });
  });

  it('returns null without calling Shopify for queries shorter than 2 chars', async () => {
    const response = await GET(request('a'));
    const body = await response.json();

    expect(body.data.predictiveSearch).toBeNull();
    expect(predictiveSearch).not.toHaveBeenCalled();
  });

  it('rejects overly long queries', async () => {
    const response = await GET(request('x'.repeat(101)));

    expect(response.status).toBe(400);
    expect(predictiveSearch).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const response = await GET(request('hat'));

    expect(response.status).toBe(429);
    expect(predictiveSearch).not.toHaveBeenCalled();
  });
});
