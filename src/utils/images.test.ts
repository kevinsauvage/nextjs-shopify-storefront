import type { ImageFieldsFragment } from '@/shopify/storefront';

import { mapShopifyImagesToImageFields, mapShopifyImageToImageFields } from './images';

import { describe, expect, it } from 'vitest';

const CDN_BASE = 'https://cdn.shopify.com';

const IMAGE: ImageFieldsFragment = {
  altText: 'Blue dress',
  blurDataURL: 'data:image/jpeg;base64,blur',
  height: 1200,
  large: `${CDN_BASE}/large.jpg`,
  medium: `${CDN_BASE}/medium.jpg`,
  small: `${CDN_BASE}/small.jpg`,
  src: `${CDN_BASE}/src.jpg`,
  url: `${CDN_BASE}/url.jpg`,
  width: 800,
};

describe('mapShopifyImageToImageFields', () => {
  it('returns null for missing images', () => {
    expect(mapShopifyImageToImageFields(null)).toBeNull();
    expect(mapShopifyImageToImageFields(undefined)).toBeNull();
  });

  it('maps every field of a complete image', () => {
    expect(mapShopifyImageToImageFields(IMAGE)).toEqual({
      altText: 'Blue dress',
      blurDataURL: 'data:image/jpeg;base64,blur',
      height: 1200,
      large: `${CDN_BASE}/large.jpg`,
      medium: `${CDN_BASE}/medium.jpg`,
      small: `${CDN_BASE}/small.jpg`,
      src: `${CDN_BASE}/src.jpg`,
      width: 800,
    });
  });

  it('falls back to src/url when responsive variants are missing', () => {
    const minimal = { ...IMAGE, blurDataURL: '', large: '', medium: '', small: '' };

    expect(mapShopifyImageToImageFields(minimal)).toMatchObject({
      blurDataURL: '',
      large: `${CDN_BASE}/src.jpg`,
      medium: `${CDN_BASE}/src.jpg`,
      small: `${CDN_BASE}/src.jpg`,
    });
  });

  it('nulls optional scalars when absent', () => {
    const sparse = {
      ...IMAGE,
      altText: null,
      height: null,
      width: undefined,
    };

    expect(mapShopifyImageToImageFields(sparse)).toMatchObject({
      altText: null,
      height: null,
      width: null,
    });
  });

  it('falls back through src to url and finally to empty strings', () => {
    const urlOnly = {
      ...IMAGE,
      blurDataURL: undefined as never,
      large: '',
      medium: '',
      small: '',
      src: '',
    };

    expect(mapShopifyImageToImageFields(urlOnly)).toMatchObject({
      blurDataURL: '',
      large: '',
      medium: '',
      small: '',
      src: `${CDN_BASE}/url.jpg`,
    });

    const empty = { ...IMAGE, large: '', medium: '', small: '', src: '', url: '' };

    expect(mapShopifyImageToImageFields(empty)).toMatchObject({
      large: '',
      medium: '',
      small: '',
      src: '',
    });
  });
});

describe('mapShopifyImagesToImageFields', () => {
  it('returns an empty list for missing input', () => {
    expect(mapShopifyImagesToImageFields(null)).toEqual([]);
    expect(mapShopifyImagesToImageFields(undefined)).toEqual([]);
  });

  it('maps edges and drops null images', () => {
    expect(mapShopifyImagesToImageFields([{ node: IMAGE }, { node: null as never }])).toHaveLength(
      1,
    );
  });
});
