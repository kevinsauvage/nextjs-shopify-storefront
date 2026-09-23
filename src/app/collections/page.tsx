import type { Metadata } from 'next';
import Link from 'next/link';

import CollectionGrid from '@/components/CollectionGrid/CollectionGrid';
import PageBanner from '@/components/PageBanner';
import { Button } from '@/components/ui/button';
import config from '@/config';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify/index';
import { CollectionSortKeys } from '@/shopify/storefront/index';

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
    <div className="pb-16 md:pb-24">
      <PageBanner
        eyebrow="Explore"
        title="Collections"
        description="Browse all of our collections to find the products you love."
      />

      <div className="container mx-auto px-4 md:px-6">
        {collections.length > 0 ? (
          <CollectionGrid collections={collections} preloadFeatured />
        ) : (
          <div className="rounded-[var(--radius)] border border-dashed border-border py-16 text-center">
            <h2 className="text-heading-3">Nothing here yet</h2>
            <p className="mx-auto mt-2 max-w-md px-4 text-body text-secondary">
              No collections are available right now. Please check back soon.
            </p>
            <Button asChild className="mt-6">
              <Link href={config.routes.home}>Back to home</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionsPage;
