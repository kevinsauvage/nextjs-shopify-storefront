import type { Metadata } from 'next';
import Link from 'next/link';

import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import ListingHeader from '@/components/ListingHeader';
import PageBanner from '@/components/PageBanner';
import PageInfoPagination from '@/components/PageInfoPagination';
import ProductEdgeList from '@/components/ProductsEdgeList';
import { Button } from '@/components/ui/button';
import config from '@/config';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify';
import { adjustPaginationVariables, parseFiltersQuery } from '@/shopify/helpers';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';
import { ProductCollectionSortKeys } from '@/shopify/storefront';

import CollectionNav, { type CollectionNavItem } from '../_components/CollectionNav';
import Filters from '../_components/Filters';
import Sort from '../_components/Sort';

export const revalidate = 3600; // Revalidate every hour

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
    if (typeof item?.url === 'string' && item.url.toLowerCase().includes(collectionSlug.toLowerCase())) {
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

  const banner = (
    <PageBanner
      title={collection?.title || 'Collection'}
      description={collection?.description ?? undefined}
    >
      <Breadcrumbs />
      <CollectionNav
        collectionSlug={collectionSlug}
        items={getCollectionNavItems(menuResponse?.menu, collectionSlug)}
      />
    </PageBanner>
  );

  if (!edges?.length) {
    return (
      <div>
        {banner}
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
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
              <Link href="/" className="link">
                Go home
              </Link>
            }
          />
        </div>
      </div>
    );
  }

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
    <div>
      {banner}
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
        <ListingHeader>
          <Sort
            query={
              searchParameters?.sort_key
                ? searchParameters
                : { sort_key: ProductCollectionSortKeys.BestSelling }
            }
            sortingOptions={sortingOptions}
          />
          <Filters filters={safeFilters} query={safeSearchParameters} />
        </ListingHeader>

        <ProductEdgeList products={edges} layout="grid" />
        <PageInfoPagination pageInfo={safePageInfo} searchParameters={safeSearchParameters} />
      </div>
    </div>
  );
};

export default CollectionSlugPage;
