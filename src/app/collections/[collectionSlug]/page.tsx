import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import JsonLd from '@/components/JsonLd';
import ListingHeader from '@/components/ListingHeader';
import PageInfoPagination from '@/components/PageInfoPagination';
import ProductsList from '@/components/ProductsList';
import { Button } from '@/components/ui/button';
import config from '@/config';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/server/structured-data';
import { storefrontSdk } from '@/shopify';
import { adjustPaginationVariables, parseFiltersQuery } from '@/shopify/helpers';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';
import { ProductCollectionSortKeys } from '@/shopify/storefront';

import CollectionNav, { type CollectionNavItem } from '../_components/CollectionNav';
import Filters from '../_components/Filters';
import Sort from '../_components/Sort';

type parametersType = { collectionSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<parametersType>;
}): Promise<Metadata> {
  const { collectionSlug } = await params;

  const collectionResponse = await storefrontSdk().getCollectionSeoByHandle({
    handle: collectionSlug,
  });

  const { collection } = collectionResponse || {};

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
  const collectionImage = collection.image?.originalSrc;

  return generateMetadataUtil({
    title,
    description,
    url: `/collections/${collectionSlug}`,
    image: collectionImage,
  });
}

const findRecursiveMenuItem = (
  items: GetMenuByHandleQuery['menu'] | null | undefined,
  collectionSlug: string,
): boolean => {
  if (!items?.items) return false;

  for (const item of items.items) {
    if (
      typeof item?.url === 'string' &&
      item.url.toLowerCase().includes(collectionSlug.toLowerCase())
    ) {
      return true;
    } else if (item?.items?.length) {
      const foundItem = findRecursiveMenuItem(
        { items: item.items } as GetMenuByHandleQuery['menu'],
        collectionSlug,
      );
      if (foundItem) {
        return true;
      }
    }
  }
  return false;
};

const getCollectionNavItems = (
  menu: GetMenuByHandleQuery['menu'] | null | undefined,
  collectionSlug: string,
): CollectionNavItem[] => {
  if (!menu?.items) return [];

  const foundItem = menu.items.find((item) => {
    if (typeof item?.url === 'string') {
      return findRecursiveMenuItem(
        { items: item.items || [] } as GetMenuByHandleQuery['menu'],
        collectionSlug,
      );
    }
    return false;
  });

  return foundItem?.items || [];
};

const CollectionSlugPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ collectionSlug: string }>;
  searchParams?: Promise<{
    after?: string;
    before?: string;
    filters?: string;
    sort_key?: string;
    reverse?: boolean;
  }>;
}) => {
  const { collectionSlug } = await params;
  const searchParameters = (await searchParams) || {};

  const sortKey = Object.keys(ProductCollectionSortKeys).find(
    (key) => key.toLowerCase() === searchParameters?.sort_key?.toLowerCase(),
  ) as keyof typeof ProductCollectionSortKeys;

  const [response, menuResponse] = await Promise.all([
    storefrontSdk().collection({
      filters: parseFiltersQuery(searchParameters?.filters),
      ...adjustPaginationVariables({
        after: searchParameters?.after || undefined,
        before: searchParameters?.before || undefined,
        first: 16,
        last: 16,
        reverse: searchParameters?.reverse || false,
      }),
      handle: collectionSlug,
      identifiers: [],
      sortKey: ProductCollectionSortKeys[sortKey] || ProductCollectionSortKeys.BestSelling,
    }),
    storefrontSdk().getMenuByHandle({ handle: config.constants.menuHandles.main }),
  ]);

  const { collection } = response || {};
  const { products } = collection || {};
  const { filters, pageInfo, edges } = products || {};

  const collectionImage = collection?.image;
  const basePath = `${config.routes.collection}/${collectionSlug}`;

  const safeFilters = filters || [];
  const safePageInfo = pageInfo || {
    endCursor: null,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
  };
  const safeSearchParameters = {
    after: searchParameters?.after,
    before: searchParameters?.before,
    filters: searchParameters?.filters,
    sort_key: searchParameters?.sort_key,
  };

  const navItems = getCollectionNavItems(menuResponse?.menu, collectionSlug);
  const activeFilterCount = parseFiltersQuery(searchParameters?.filters).length;
  const safeEdges = edges ?? [];
  const pageCount = safeEdges.length;

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
    <div className="pb-16 md:pb-24">
      <JsonLd
        data={[
          collectionPageJsonLd({
            name: collection?.title || 'Collection',
            description: collection?.description,
            url: basePath,
          }),
          breadcrumbJsonLd([
            { name: 'Home', url: config.routes.home },
            { name: 'Collections', url: config.routes.collection },
            { name: collection?.title || 'Collection', url: basePath },
          ]),
        ]}
      />
      {/* Breadcrumb bar */}
      <div className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <Breadcrumbs lastElement={collection?.title} />
        </div>
      </div>

      {/* Hero */}
      {collectionImage?.src ? (
        <section className="relative isolate overflow-hidden">
          <div className="relative h-[40vh] min-h-[300px] w-full md:h-[52vh] md:min-h-[420px]">
            <Image
              src={collectionImage.src}
              alt={collectionImage.altText || collection?.title || 'Collection image'}
              fill
              priority
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
              <h1 className="mt-3 max-w-3xl text-white">{collection?.title || 'Collection'}</h1>
              {collection?.description ? (
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
            <h1 className="mt-4 text-balance">{collection?.title || 'Collection'}</h1>
            {collection?.description ? (
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-body-lg text-secondary">
                {collection.description}
              </p>
            ) : null}
          </div>
        </section>
      )}

      {/* Sibling collection navigation */}
      {navItems.length > 0 ? (
        <div className="border-b border-border/60">
          <div className="container mx-auto px-4 py-4 md:px-6">
            <CollectionNav collectionSlug={collectionSlug} items={navItems} />
          </div>
        </div>
      ) : null}

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
                      searchParameters?.sort_key
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
            title="Collection not found"
            subtitle="This collection doesn't exist or has been removed. Browse our other collections to find what you're looking for."
            altText="Collection Not Found"
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
    </div>
  );
};

export default CollectionSlugPage;
