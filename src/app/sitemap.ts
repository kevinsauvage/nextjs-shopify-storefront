import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import config, { sitemap as sitemapConfig } from '@/config';
import { reportError } from '@/lib/logger';
import { getBaseUrl } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify';

const PAGE_SIZE = 250;

type SitemapItem = {
  handle: string;
  updatedAt?: string;
};

async function paginate(
  fetchPage: (after?: string) => Promise<{
    pageInfo: { hasNextPage: boolean; endCursor?: string | null };
    edges: Array<{ node: SitemapItem }>;
  }>,
): Promise<SitemapItem[]> {
  const items: SitemapItem[] = [];
  let after: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    // Sequential cursor pagination: each request depends on the previous cursor.
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchPage(after);

    for (const edge of page.edges) {
      if (edge.node.handle) {
        items.push(edge.node);
      }
    }

    hasNextPage = page.pageInfo.hasNextPage && Boolean(page.pageInfo.endCursor);
    after = page.pageInfo.endCursor ?? undefined;
  }

  return items;
}

const getAllProducts = (): Promise<SitemapItem[]> =>
  paginate(async (after) => {
    const { products } = await storefrontSdk().getProductsForSitemap({ after, first: PAGE_SIZE });
    return products;
  });

const getAllCollections = (): Promise<SitemapItem[]> =>
  paginate(async (after) => {
    const { collections } = await storefrontSdk().getCollectionsForSitemap({
      after,
      first: PAGE_SIZE,
    });
    return collections;
  });

const getAllPages = (): Promise<SitemapItem[]> =>
  paginate(async (after) => {
    const { pages } = await storefrontSdk().getPagesForSitemap({ after, first: PAGE_SIZE });
    return pages;
  });

const getStaticEntries = (baseUrl: string, now: Date): MetadataRoute.Sitemap =>
  sitemapConfig.map((entry) => ({
    ...entry,
    lastModified: now,
    url: entry.url.startsWith('http') ? entry.url : `${baseUrl}${entry.url}`,
  }));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheLife('hours');
  cacheTag('shopify');

  const baseUrl = getBaseUrl();
  const now = new Date();

  const [products, collections, pages] = await Promise.all([
    getAllProducts().catch((error) => {
      reportError('sitemap/products', error);
      return [] as SitemapItem[];
    }),
    getAllCollections().catch((error) => {
      reportError('sitemap/collections', error);
      return [] as SitemapItem[];
    }),
    getAllPages().catch((error) => {
      reportError('sitemap/pages', error);
      return [] as SitemapItem[];
    }),
  ]);

  const collectionEntries: MetadataRoute.Sitemap = collections.map((item) => ({
    changeFrequency: 'daily',
    lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
    priority: 0.8,
    url: `${baseUrl}${config.routes.collection}/${item.handle}`,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((item) => ({
    changeFrequency: 'weekly',
    lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
    priority: 0.7,
    url: `${baseUrl}${config.routes.collection}/products/${item.handle}`,
  }));

  const pageEntries: MetadataRoute.Sitemap = pages.map((item) => ({
    changeFrequency: 'monthly',
    lastModified: item.updatedAt ? new Date(item.updatedAt) : now,
    priority: 0.5,
    url: `${baseUrl}/pages/${item.handle}`,
  }));

  return [
    ...getStaticEntries(baseUrl, now),
    ...collectionEntries,
    ...productEntries,
    ...pageEntries,
  ];
}
