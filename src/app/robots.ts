import type { MetadataRoute } from 'next';

import { getBaseUrl } from '@/lib/server/metadata';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account', // Private account overview (bare route)
        '/account/', // Private user account pages (orders, addresses, etc.)
        '/api/', // API routes (not meant for search engines)
        '/search', // Dynamic search pages (not useful for SEO)
        '/cart', // Cart pages are user-specific and not useful for SEO
        '/wishlist', // Per-browser wishlist + user-generated shared links are noindexed
        '/login', // Auth pages add no crawl value
        '/register',
        '/recover',
        '/reset_password',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
