import 'server-only';

import { storefrontSdk } from '@/shopify';
import { adjustPaginationVariables, parseFiltersQuery } from '@/shopify/helpers';
import type { ProductCollectionSortKeys } from '@/shopify/storefront';

export const COLLECTION_PAGE_SIZE = 16;

export type CollectionQuery = {
  after?: string;
  before?: string;
  filters?: string;
  reverse?: boolean;
  sort_key?: string;
};

/** Valid `ProductCollectionSortKeys` values, for runtime query-param parsing. */
const COLLECTION_SORT_KEYS = [
  'BEST_SELLING',
  'COLLECTION_DEFAULT',
  'CREATED',
  'ID',
  'MANUAL',
  'PRICE',
  'RELEVANCE',
  'TITLE',
] as const satisfies readonly ProductCollectionSortKeys[];

/** Compare sort keys ignoring case and separators (`best-selling` ≡ `BEST_SELLING`). */
export const normalizeSortKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Resolve a raw `sort_key` query value to a known sort key, defaulting safely. */
export const resolveCollectionSortKey = (raw?: string): ProductCollectionSortKeys => {
  const normalized = raw ? normalizeSortKey(raw) : '';

  return (
    COLLECTION_SORT_KEYS.find((key) => normalizeSortKey(key) === normalized) ?? 'BEST_SELLING'
  );
};

/** Fetch a single page of a collection. */
export const fetchCollectionPage = async (handle: string, query: CollectionQuery = {}) => {
  const response = await storefrontSdk().collection({
    filters: parseFiltersQuery(query.filters),
    ...adjustPaginationVariables({
      after: query.after,
      before: query.before,
      first: COLLECTION_PAGE_SIZE,
      last: COLLECTION_PAGE_SIZE,
      reverse: query.reverse ?? false,
    }),
    handle,
    identifiers: [],
    sortKey: resolveCollectionSortKey(query.sort_key),
  });

  return response.collection ?? null;
};

const STATIC_PARAMS_PAGE_SIZE = 250;

/**
 * Every collection handle, for `generateStaticParams`. Under Cache Components a
 * dynamic route prerenders the params returned here so its static shell (hero,
 * breadcrumb, JSON-LD) ships without waiting on request-time `searchParams`.
 */
export const getCollectionHandlesForStaticParams = async (): Promise<
  Array<{ collectionSlug: string }>
> => {
  const handles: Array<{ collectionSlug: string }> = [];
  let after: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    // Sequential cursor pagination: each request depends on the previous cursor.
    // eslint-disable-next-line no-await-in-loop
    const { collections } = await storefrontSdk().getCollectionsForSitemap({
      after,
      first: STATIC_PARAMS_PAGE_SIZE,
    });

    for (const edge of collections.edges) {
      if (edge.node.handle) handles.push({ collectionSlug: edge.node.handle });
    }

    hasNextPage = collections.pageInfo.hasNextPage && Boolean(collections.pageInfo.endCursor);
    after = collections.pageInfo.endCursor ?? undefined;
  }

  return handles;
};
