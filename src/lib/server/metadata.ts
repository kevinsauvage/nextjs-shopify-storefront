import type { Metadata } from 'next';

import siteMetadata from '@/data/siteMetadata';

/**
 * Get base URL for the application
 * Server-side utility for metadata generation
 */
export function getBaseUrl(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (envBaseUrl) {
    // Remove trailing slash if present
    return envBaseUrl.replace(/\/$/, '');
  }

  // Fallback to siteMetadata (useful for development)
  if (siteMetadata.siteUrl) {
    return siteMetadata.siteUrl;
  }

  // Last resort: throw error to make the issue explicit
  throw new Error(
    'NEXT_PUBLIC_BASE_URL is not set and siteMetadata.siteUrl is not configured. ' +
      'Please set NEXT_PUBLIC_BASE_URL environment variable.',
  );
}

type MetadataOptions = {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  /**
   * Emit the title as an absolute string (with the site name appended). Use for
   * pages in the root segment, where the root layout's title template does not
   * apply.
   */
  absoluteTitle?: boolean;
};

/**
 * Generate Next.js metadata object
 * Server-side utility for SEO metadata
 */
export function generateMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
  absoluteTitle = false,
}: MetadataOptions): Metadata {
  // Use getBaseUrl() to ensure consistency and proper env var handling
  const siteUrl = getBaseUrl();
  const fullTitle = `${title} | ${siteMetadata.companyName}`;
  const imageUrl = image || siteMetadata.siteLogo;
  const pageUrl = url ? `${siteUrl}${url}` : siteUrl;

  return {
    // Nested routes inherit the root layout's title template, so their titles
    // stay unqualified here; the root page opts into an absolute title.
    title: absoluteTitle ? { absolute: fullTitle } : title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: pageUrl,
      siteName: siteMetadata.companyName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: siteMetadata.twitterHandle,
    },
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
