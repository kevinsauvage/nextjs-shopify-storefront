import { trackSearch } from './analytics';

import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('window', { dataLayer: [] });
});

describe('trackSearch', () => {
  it('pushes a GA4 search event with the term and result count', () => {
    trackSearch({ searchTerm: 'linen dress', resultsCount: 3 });

    expect(window.dataLayer).toEqual([
      { event: 'search', search_term: 'linen dress', results_count: 3 },
    ]);
  });

  it('omits the result count when not provided', () => {
    trackSearch({ searchTerm: 'linen' });

    expect(window.dataLayer).toEqual([{ event: 'search', search_term: 'linen' }]);
  });

  it('creates the dataLayer when GTM has not initialised it', () => {
    vi.stubGlobal('window', {});

    trackSearch({ searchTerm: 'denim' });

    expect(window.dataLayer).toEqual([{ event: 'search', search_term: 'denim' }]);
  });

  it('no-ops without a window (SSR)', () => {
    vi.stubGlobal('window', undefined);

    expect(() => trackSearch({ searchTerm: 'x' })).not.toThrow();
  });
});
