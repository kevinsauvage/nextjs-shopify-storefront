import type { Metadata } from 'next';
import Link from 'next/link';

import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import ListingHeader from '@/components/ListingHeader';
import PageBanner from '@/components/PageBanner';
import PageInfoPagination from '@/components/PageInfoPagination';
import ProductsList from '@/components/ProductsList';
import Search from '@/components/Search';
import { Button } from '@/components/ui/button';
import config from '@/config';
import seo from '@/data/seo';
import { normalizeSortKey } from '@/lib/server/collection';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import {
  adjustPaginationVariables,
  buildShopifySearchQuery,
  parseFiltersQuery,
} from '@/shopify/helpers';
import { storefrontSdk } from '@/shopify/index';
import type {
  ProductFieldsFragment,
  SearchProductsQuery,
  SearchSortKeys,
} from '@/shopify/storefront';

import Filters from '../collections/_components/Filters';
import Sort from '../collections/_components/Sort';

/** Valid `SearchSortKeys` values, for runtime query-param parsing. */
const SEARCH_SORT_KEYS = ['PRICE', 'RELEVANCE'] as const satisfies readonly SearchSortKeys[];

const resolveSearchSortKey = (raw?: string): SearchSortKeys => {
  const normalized = raw ? normalizeSortKey(raw) : '';

  return SEARCH_SORT_KEYS.find((key) => normalizeSortKey(key) === normalized) ?? 'RELEVANCE';
};

export const metadata: Metadata = generateMetadataUtil({
  title: seo.search.title,
  description: seo.search.description,
  url: config.routes.search,
  noindex: true, // Search result pages have no crawl value and are disallowed in robots.ts
});

type SearchParameters = {
  searchQuery: string;
  after?: string;
  before?: string;
  sort_key?: string;
  filters?: string;
  reverse?: boolean;
};

/** Shared banner so the empty-query early return below duplicates no markup. */
const SearchBanner = ({ searchQuery }: { searchQuery?: string }) => (
  <PageBanner
    title={seo.search.title}
    eyebrow="Search the store"
    description={seo.search.description}
  >
    <Breadcrumbs />
    <Search key={searchQuery ?? ''} searchQuery={searchQuery ?? ''} />
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-caption text-secondary">Popular:</span>
      {['Linen', 'Denim', 'Dress', 'Knit', 'Boots'].map((term) => (
        <Button key={term} variant="outline" size="sm" asChild className="rounded-full">
          <Link href={`${config.routes.search}?searchQuery=${encodeURIComponent(term)}`}>
            {term}
          </Link>
        </Button>
      ))}
    </div>
  </PageBanner>
);

const Page = async ({ searchParams }: { searchParams: Promise<SearchParameters> }) => {
  const searchParameters = await searchParams;
  const hasQuery = Boolean(searchParameters.searchQuery?.trim());

  // Never burn a Storefront request on the empty state.
  if (!hasQuery) {
    return (
      <div>
        <SearchBanner searchQuery={searchParameters.searchQuery} />
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
          <EmptyState
            variant="search"
            title="Search our store"
            subtitle="Enter a keyword to find products. Try a material, category, or product name — or pick a popular search above."
            altText="Search our store"
            primaryAction={
              <Button variant="default" asChild>
                <Link href="/collections">Browse Collections</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const response: SearchProductsQuery = await storefrontSdk().searchProducts({
    ...adjustPaginationVariables({
      after: searchParameters.after,
      before: searchParameters.before,
      first: config.constants.pagination.productsPerPage,
    }),
    identifiers: [],
    productFilters: parseFiltersQuery(searchParameters?.filters),
    query: buildShopifySearchQuery(searchParameters.searchQuery),
    sortKey: resolveSearchSortKey(searchParameters.sort_key),
  });

  const { pageInfo } = response.search;
  const filters = response.search.productFilters;

  const products = response.search?.edges.map((edge) => ({
    ...edge.node,
  })) as Array<ProductFieldsFragment>;

  const sortingOptions = [
    {
      label: 'Relevance',
      name: 'RELEVANCE',
    },
    {
      label: 'Price, low to high',
      name: 'PRICE',
    },
  ];

  return (
    <div>
      <SearchBanner searchQuery={searchParameters.searchQuery} />
      {products.length > 0 ? (
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
          <ListingHeader>
            <Sort
              query={{ sort_key: searchParameters?.sort_key || 'RELEVANCE' }}
              sortingOptions={sortingOptions}
            />
            <Filters filters={filters} query={searchParameters} />
          </ListingHeader>
          <h2 className="sr-only">Search results</h2>
          <ProductsList layout="grid" products={products} />{' '}
          <PageInfoPagination
            pageInfo={pageInfo}
            searchParameters={searchParameters}
            basePath={config.routes.search}
          />
        </div>
      ) : (
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
          <EmptyState
            variant="search"
            title="No results found"
            subtitle="We couldn't find any products matching your search. Try different keywords or browse our collections."
            altText="No search results"
            primaryAction={
              <Button variant="default" asChild>
                <Link href="/collections">Browse Collections</Link>
              </Button>
            }
            secondaryAction={
              <Link href="/" className="link">
                Clear search and try again
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
};

export default Page;
