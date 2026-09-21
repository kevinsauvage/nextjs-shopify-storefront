import type { Metadata } from 'next';

import CollectionGrid from '@/components/CollectionGrid/CollectionGrid';
import PageBanner from '@/components/PageBanner';
import config from '@/config';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify/index';
import { CollectionSortKeys } from '@/shopify/storefront/index';

export const revalidate = 3600; // Revalidate every hour

export const metadata: Metadata = generateMetadataUtil({
  title: 'Collections',
  description: 'Browse all of our collections to find the products you love.',
  url: config.routes.collection,
});

const CollectionsPage = async () => {
  const response = await storefrontSdk().collections({
    first: 100,
    firstProducts: 1,
    identifiers: [],
    sortKey: CollectionSortKeys.Title,
  });

  const collections = response.collections.edges;

  return (
    <div className="pb-12 md:pb-16">
      <PageBanner
        title="Collections"
        description="Browse all of our collections to find the products you love."
      />

      <div className="container mx-auto px-4 md:px-6">
        {collections.length > 0 ? (
          <CollectionGrid collections={collections} />
        ) : (
          <p className="text-center text-body text-secondary">
            No collections are available right now. Please check back soon.
          </p>
        )}
      </div>
    </div>
  );
};

export default CollectionsPage;
