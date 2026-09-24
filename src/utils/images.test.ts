import type { ImageFieldsFragment } from '@/shopify/storefront';

import { mapShopifyImagesToImageFields, mapShopifyImageToImageFields } from './images';

import { describe, expect, it } from 'vitest';

const IMAGE: ImageFieldsFragment = {
  altText: 'Blue dress',
  blurDataURL: 'data:image/jpeg;base64,blur',
  height: 1200,
  large: 'https://cdn.shopify.com/large.jpg',
  medium: 'https://cdn.shopify.com/medium.jpg',
  small: 'https://cdn.shopify.com/small.jpg',
  src: 'https://cdn.shopify.com/src.jpg',
  url: 'https://cdn.shopify.com/url.jpg',
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
      large: 'https://cdn.shopify.com/large.jpg',
      medium: 'https://cdn.shopify.com/medium.jpg',
      small: 'https://cdn.shopify.com/small.jpg',
      src: 'https://cdn.shopify.com/src.jpg',
      width: 800,
    });
  });

  it('falls back to src/url when responsive variants are missing', () => {
    const minimal = { ...IMAGE, blurDataURL: '', large: '', medium: '', small: '' };

    expect(mapShopifyImageToImageFields(minimal)).toMatchObject({
      blurDataURL: '',
      large: 'https://cdn.shopify.com/src.jpg',
      medium: 'https://cdn.shopify.com/src.jpg',
      small: 'https://cdn.shopify.com/src.jpg',
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
