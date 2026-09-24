import siteMetadata from '@/data/siteMetadata';

import { generateMetadata, getBaseUrl } from './metadata';

import { afterEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'https://shop.example.com';

describe('getBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the configured base URL without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', `${BASE_URL}/`);

    expect(getBaseUrl()).toBe(BASE_URL);
  });

  it('falls back to the site metadata URL when the env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');

    expect(getBaseUrl()).toBe(siteMetadata.siteUrl);
  });

  it('throws when neither the env var nor site metadata provides a URL', () => {
    const original = siteMetadata.siteUrl;
    (siteMetadata as { siteUrl: string }).siteUrl = '';
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');

    expect(() => getBaseUrl()).toThrow(/NEXT_PUBLIC_BASE_URL/);

    (siteMetadata as { siteUrl: string }).siteUrl = original;
  });
});

describe('generateMetadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds canonical, Open Graph and Twitter metadata', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    const metadata = generateMetadata({
      description: 'Search the store',
      title: 'Search',
      url: '/search',
    });

    expect(metadata).toMatchObject({
      description: 'Search the store',
      title: 'Search',
    });
    expect(metadata.alternates).toMatchObject({ canonical: `${BASE_URL}/search` });
    expect(metadata.openGraph).toMatchObject({
      title: `Search | ${siteMetadata.companyName}`,
      type: 'website',
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(metadata.robots).toMatchObject({ follow: true, index: true });
  });

  it('emits an absolute title and noindex on demand', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', BASE_URL);

    const metadata = generateMetadata({
      absoluteTitle: true,
      description: 'Home',
      noindex: true,
      title: 'Home',
    });

    expect(metadata.title).toEqual({ absolute: `Home | ${siteMetadata.companyName}` });
    expect(metadata.robots).toMatchObject({ follow: false, index: false });
  });
});
