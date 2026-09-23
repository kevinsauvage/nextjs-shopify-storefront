import { storefrontSdk } from '@/shopify';
import { adjustPaginationVariables, parseFiltersQuery } from '@/shopify/helpers';
import { ProductCollectionSortKeys } from '@/shopify/storefront';

export const COLLECTION_PAGE_SIZE = 16;

export type CollectionQuery = {
  after?: string;
  before?: string;
  filters?: string;
  reverse?: boolean;
  sort_key?: string;
};

/** Resolve a raw `sort_key` query value to a known sort key, defaulting safely. */
export const resolveCollectionSortKey = (raw?: string): ProductCollectionSortKeys => {
  const key = Object.keys(ProductCollectionSortKeys).find(
    (candidate) => candidate.toLowerCase() === raw?.toLowerCase(),
  ) as keyof typeof ProductCollectionSortKeys | undefined;

  return (key && ProductCollectionSortKeys[key]) || ProductCollectionSortKeys.BestSelling;
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
