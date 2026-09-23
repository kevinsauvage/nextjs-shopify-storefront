import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import JsonLd from '@/components/JsonLd';
import ListingHeader from '@/components/ListingHeader';
import PageInfoPagination from '@/components/PageInfoPagination';
import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import ProductsList from '@/components/ProductsList';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import config from '@/config';
import {
  fetchCollectionPage,
  getCollectionHandlesForStaticParams,
} from '@/lib/server/collection';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/server/structured-data';
import { parseFiltersQuery } from '@/shopify/helpers';
import { ProductCollectionSortKeys } from '@/shopify/storefront';

import Filters from '../_components/Filters';
import Sort from '../_components/Sort';

type parametersType = { collectionSlug: string };

type SearchParameters = {
  after?: string;
  before?: string;
  filters?: string;
  sort_key?: string;
  reverse?: boolean;
};

/**
 * Collection lookup memoized for the lifetime of a single request.
 * `generateMetadata` and the page body both need the collection; without this
 * they each issue the same Shopify round-trip. Arguments are primitives so
 * React's `cache` can dedupe them by value (the default view hits the cache).
 */
const getCollection = cache(
  async (
    handle: string,
    sortKey: string | undefined,
    filters: string | undefined,
    after: string | undefined,
    before: string | undefined,
    reverse: boolean,
  ) => fetchCollectionPage(handle, { after, before, filters, reverse, sort_key: sortKey }),
);

/** Prerender the known collection paths so their hero ships in the static shell. */
export async function generateStaticParams(): Promise<Array<parametersType>> {
  return getCollectionHandlesForStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<parametersType>;
}): Promise<Metadata> {
  const { collectionSlug } = await params;

  const collection = await getCollection(
    collectionSlug,
    undefined,
    undefined,
    undefined,
    undefined,
    false,
  );

  if (!collection) {
    return generateMetadataUtil({
      title: 'Collection Not Found',
      description: 'Collection not found',
      url: `/collections/${collectionSlug}`,
      noindex: true,
    });
  }

  const title = collection.seo?.title || collection.title || 'Collection';
  const description = collection.seo?.description || collection.description || 'Collection';
  const collectionImage = collection.image?.src;

  return generateMetadataUtil({
    title,
    description,
    url: `/collections/${collectionSlug}`,
    image: collectionImage,
  });
}

/**
 * Static part of the page: JSON-LD, breadcrumb and hero. Depends only on
 * `params`, so with `generateStaticParams` it renders into the prerendered
 * shell instead of waiting on request-time `searchParams`.
 */
const CollectionHeader = async ({ params }: { params: Promise<parametersType> }) => {
  const { collectionSlug } = await params;

  const collection = await getCollection(
    collectionSlug,
    undefined,
    undefined,
    undefined,
    undefined,
    false,
  );

  // A missing collection is a real 404; an existing collection with no matching
  // products is an empty state (handled in the products section), not a 404.
  if (!collection) {
    notFound();
  }

  const collectionImage = collection.image;
  const basePath = `${config.routes.collection}/${collectionSlug}`;

  return (
    <>
      <JsonLd
        data={[
          collectionPageJsonLd({
            name: collection.title || 'Collection',
            description: collection.description,
            url: basePath,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: config.routes.home },
            { name: 'Collections', url: config.routes.collection },
            { name: collection.title || 'Collection', url: basePath },
          ]),
        ]}
      />
      {/* Breadcrumb bar */}
      <div className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <Breadcrumbs lastElement={collection.title} />
        </div>
      </div>

      {/* Hero */}
      {collectionImage?.src ? (
        <section className="relative isolate overflow-hidden">
          <div className="relative h-[40vh] min-h-[300px] w-full md:h-[52vh] md:min-h-[420px]">
            <Image
              src={collectionImage.large || collectionImage.src}
              alt={collectionImage.altText || collection.title || 'Collection image'}
              fill
              preload
              quality={82}
              sizes="100vw"
              placeholder={collectionImage.blurDataURL ? 'blur' : 'empty'}
              blurDataURL={collectionImage.blurDataURL || undefined}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          </div>
          <div className="absolute inset-0 flex items-end">
            <div className="container mx-auto px-4 pb-10 md:px-6 md:pb-14">
              <span className="text-eyebrow text-white/80">Collection</span>
              <h1 className="mt-3 max-w-3xl text-white">{collection.title || 'Collection'}</h1>
              {collection.description ? (
                <p className="mt-4 max-w-2xl text-body-lg text-white/85">
                  {collection.description}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-border/60">
          <div className="container mx-auto px-4 py-14 text-center md:px-6 md:py-20">
            <span className="text-eyebrow">Collection</span>
            <h1 className="mt-4 text-balance">{collection.title || 'Collection'}</h1>
            {collection.description ? (
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-body-lg text-secondary">
                {collection.description}
              </p>
            ) : null}
          </div>
        </section>
      )}
    </>
  );
};

/**
 * Request-time part of the page: sort/filter toolbar, product grid, pagination.
 * Reads `searchParams`, so it streams in while the header above stays static.
 */
const CollectionProducts = async ({
  params,
  searchParams,
}: {
  params: Promise<parametersType>;
  searchParams?: Promise<SearchParameters>;
}) => {
  const { collectionSlug } = await params;
  const searchParameters = (await searchParams) || {};

  const collection = await getCollection(
    collectionSlug,
    searchParameters.sort_key,
    searchParameters.filters,
    searchParameters.after || undefined,
    searchParameters.before || undefined,
    searchParameters.reverse || false,
  );

  if (!collection) {
    notFound();
  }

  const { products } = collection;
  const { filters, pageInfo, edges } = products || {};

  const basePath = `${config.routes.collection}/${collectionSlug}`;

  const safeFilters = filters || [];
  const safePageInfo = pageInfo || {
    endCursor: null,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
  };
  const safeSearchParameters = {
    after: searchParameters.after,
    before: searchParameters.before,
    filters: searchParameters.filters,
    sort_key: searchParameters.sort_key,
  };

  const safeEdges = edges ?? [];
  const pageCount = safeEdges.length;
  const activeFilterCount = parseFiltersQuery(searchParameters.filters).length;

  const sortingOptions = [
    {
      label: 'Best Selling',
      name: ProductCollectionSortKeys.BestSelling,
    },
    {
      label: 'Relevance',
      name: ProductCollectionSortKeys.Relevance,
    },
    {
      label: 'Price, low to high',
      name: ProductCollectionSortKeys.Price,
    },
    { label: 'New Arrivals', name: ProductCollectionSortKeys.Created },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      {pageCount > 0 ? (
        <>
          <div className="sticky top-16 z-30 -mx-4 mb-8 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md md:top-20 md:-mx-6 md:px-6">
            <ListingHeader className="mb-0 items-center">
              <span className="text-caption-sm uppercase tracking-widest text-muted">
                Showing {pageCount}
                {safePageInfo.hasNextPage ? '+' : ''} {pageCount === 1 ? 'piece' : 'pieces'}
              </span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 ? (
                  <Link
                    href={basePath}
                    className="link-underline text-caption-sm font-medium text-secondary"
                  >
                    Clear filters
                  </Link>
                ) : null}
                <Sort
                  query={
                    searchParameters.sort_key
                      ? searchParameters
                      : { sort_key: ProductCollectionSortKeys.BestSelling }
                  }
                  sortingOptions={sortingOptions}
                />
                <Filters filters={safeFilters} query={safeSearchParameters} />
              </div>
            </ListingHeader>
          </div>

          <ProductsList products={safeEdges.map((edge) => edge.node)} layout="grid" />
          <PageInfoPagination
            pageInfo={safePageInfo}
            searchParameters={safeSearchParameters}
            basePath={basePath}
          />
        </>
      ) : (
        <EmptyState
          variant="default"
          title="No products here yet"
          subtitle="This collection doesn't have any products matching your selection. Try clearing filters or browse our other collections."
          altText="No products in collection"
          primaryAction={
            <Link href={config.routes.collection}>
              <Button variant="default">Browse Collections</Button>
            </Link>
          }
          secondaryAction={
            <Link href={config.routes.home} className="link">
              Go home
            </Link>
          }
        />
      )}
    </div>
  );
};

const CollectionHeaderFallback = () => (
  <>
    <div className="border-b border-border/60 bg-secondary/30">
      <div className="container mx-auto px-4 py-3 md:px-6">
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
    <section className="relative isolate overflow-hidden">
      <Skeleton className="h-[40vh] min-h-[300px] w-full rounded-none bg-muted md:h-[52vh] md:min-h-[420px]" />
    </section>
  </>
);

const CollectionProductsFallback = () => (
  <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
    <div className="mb-8 flex items-center justify-between gap-4 border-b border-border/60 pb-3">
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
    <ProductGridSkeleton />
  </div>
);

const CollectionSlugPage = ({
  params,
  searchParams,
}: {
  params: Promise<parametersType>;
  searchParams?: Promise<SearchParameters>;
}) => (
  <div className="pb-16 md:pb-24">
    <Suspense fallback={<CollectionHeaderFallback />}>
      <CollectionHeader params={params} />
    </Suspense>
    <Suspense fallback={<CollectionProductsFallback />}>
      <CollectionProducts params={params} searchParams={searchParams} />
    </Suspense>
  </div>
);

export default CollectionSlugPage;
