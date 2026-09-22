import siteMetadata from '@/data/siteMetadata';
import { getBaseUrl } from '@/lib/server/metadata';

const SCHEMA_ORG = 'https://schema.org';

export type JsonLdObject = Record<string, unknown>;

export type BreadcrumbEntry = {
  name: string;
  /** Absolute URL or root-relative path. */
  url: string;
};

/** Resolve a path or URL against the configured site origin. */
export const absoluteUrl = (pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const base = getBaseUrl();
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
};

// Placeholder values from the default site metadata must not leak into
// structured data, so drop the obvious ones.
const socialProfiles = [
  siteMetadata.facebook,
  siteMetadata.instagram,
  siteMetadata.twitter,
  siteMetadata.linkedin,
].filter((profile) => Boolean(profile) && !profile.includes('example'));

/** Site-wide `Organization` entity for the root layout. */
export const organizationJsonLd = (): JsonLdObject => ({
  '@context': SCHEMA_ORG,
  '@type': 'Organization',
  name: siteMetadata.companyName,
  url: getBaseUrl(),
  logo: siteMetadata.siteLogo,
  email: siteMetadata.email,
  telephone: siteMetadata.phoneNumber,
  sameAs: socialProfiles,
});

/** Site-wide `WebSite` entity with a search action, for the root layout. */
export const websiteJsonLd = (): JsonLdObject => ({
  '@context': SCHEMA_ORG,
  '@type': 'WebSite',
  name: siteMetadata.companyName,
  url: getBaseUrl(),
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${getBaseUrl()}/search?searchQuery={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});

export const breadcrumbJsonLd = (items: BreadcrumbEntry[]): JsonLdObject => ({
  '@context': SCHEMA_ORG,
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.url),
  })),
});

export const collectionPageJsonLd = ({
  name,
  description,
  url,
}: {
  name: string;
  description?: string | null;
  url: string;
}): JsonLdObject => ({
  '@context': SCHEMA_ORG,
  '@type': 'CollectionPage',
  name,
  ...(description ? { description } : {}),
  url: absoluteUrl(url),
});

export const productJsonLd = ({
  name,
  description,
  url,
  images,
  sku,
  brand,
  price,
  currency,
  availableForSale,
}: {
  name: string;
  description?: string | null;
  url: string;
  images: string[];
  sku?: string | null;
  brand?: string | null;
  price?: string | null;
  currency?: string | null;
  availableForSale: boolean;
}): JsonLdObject => ({
  '@context': SCHEMA_ORG,
  '@type': 'Product',
  name,
  ...(description ? { description } : {}),
  ...(sku ? { sku } : {}),
  ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
  image: images.map(absoluteUrl),
  ...(price && currency
    ? {
        offers: {
          '@type': 'Offer',
          url: absoluteUrl(url),
          priceCurrency: currency,
          price,
          availability: availableForSale ? `${SCHEMA_ORG}/InStock` : `${SCHEMA_ORG}/OutOfStock`,
          itemCondition: `${SCHEMA_ORG}/NewCondition`,
          seller: { '@type': 'Organization', name: siteMetadata.companyName },
        },
      }
    : {}),
});
