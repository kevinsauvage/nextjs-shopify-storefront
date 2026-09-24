import siteMetadata from '@/data/siteMetadata';

import {
  absoluteUrl,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from './structured-data';

import { afterEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'https://shop.example.com';

describe('absoluteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('passes absolute URLs through untouched', () => {
    expect(absoluteUrl('https://cdn.shopify.com/x.jpg')).toBe('https://cdn.shopify.com/x.jpg');
  });

  it('resolves relative paths against the site origin', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    expect(absoluteUrl('/collections/all')).toBe(`${BASE_URL}/collections/all`);
    expect(absoluteUrl('collections/all')).toBe(`${BASE_URL}/collections/all`);
  });
});

describe('JSON-LD builders', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds an Organization entity without placeholder leaks', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    const entity = organizationJsonLd() as { sameAs?: string[] };

    expect(entity).toMatchObject({ '@type': 'Organization', name: siteMetadata.companyName });
    for (const profile of entity.sameAs ?? []) {
      expect(profile).not.toContain('example');
    }
  });

  it('builds a WebSite entity with a search action', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    expect(websiteJsonLd()).toMatchObject({
      '@type': 'WebSite',
      potentialAction: expect.objectContaining({ '@type': 'SearchAction' }),
    });
  });

  it('builds an ordered BreadcrumbList', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    const list = breadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: 'All', url: '/collections/all' },
    ]) as { itemListElement: Array<{ position: number; item: string }> };

    expect(list).toMatchObject({ '@type': 'BreadcrumbList' });
    expect(list.itemListElement.map((entry) => entry.position)).toEqual([1, 2]);
    expect(list.itemListElement[1]?.item).toBe(`${BASE_URL}/collections/all`);
  });

  it('omits an absent collection description', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    expect(collectionPageJsonLd({ name: 'All', url: '/collections/all' })).not.toHaveProperty(
      'description',
    );
    expect(
      collectionPageJsonLd({ description: 'All products', name: 'All', url: '/collections/all' }),
    ).toMatchObject({ description: 'All products' });
  });

  it('builds a Product offer with availability', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    const product = productJsonLd({
      availableForSale: true,
      brand: 'CRISP',
      currency: 'USD',
      description: 'Blue dress',
      images: ['/dress.jpg'],
      name: 'Dress',
      price: '49.00',
      sku: 'D-1',
      url: '/products/dress',
    }) as { offers?: { availability?: string }; image?: string[] };

    expect(product).toMatchObject({ '@type': 'Product' });
    expect(product.offers?.availability).toContain('InStock');
    expect(product.image).toEqual([`${BASE_URL}/dress.jpg`]);
  });

  it('omits the offer when price or currency is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    const product = productJsonLd({
      availableForSale: false,
      images: [],
      name: 'Dress',
      url: '/products/dress',
    });

    expect(product).not.toHaveProperty('offers');
  });
});
