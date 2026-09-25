import type { Metadata } from 'next';
import Link from 'next/link';

import { getSharedWishlistProductsAction } from '@/actions/wishlistActions';
import NoFavoriteIllustration from '@/assets/NoFavoriteIllustration.png';
import EmptyState from '@/components/EmptyState';
import PageBanner from '@/components/PageBanner';
import ProductsList from '@/components/ProductsList';
import { Button } from '@/components/ui/button';
import config from '@/config';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';

export const metadata: Metadata = generateMetadataUtil({
  title: 'Shared wishlist',
  description: 'A wishlist shared with you.',
  // A shared link is user-specific and not a landing page: keep it out of the
  // index while still allowing it to be opened and shared.
  noindex: true,
});

const SharedWishlistPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) => {
  const { ids } = await searchParams;

  // The public action owns validation (same product-GID rule as the wishlist),
  // bounding and rate limiting, so this page cannot be abused into unbounded
  // Storefront calls. It is dynamic because the ids come from the query string.
  const products = await getSharedWishlistProductsAction(
    Array.isArray(ids) ? ids : ids ? [ids] : [],
  );

  return (
    <>
      <PageBanner
        eyebrow="Shared with you"
        title="A shared wishlist"
        description={
          products.length > 0
            ? `${products.length} ${products.length === 1 ? 'item' : 'items'} someone wanted to share with you.`
            : 'This wishlist link is empty or no longer available.'
        }
      />

      <div className="container mx-auto px-4 py-12 md:px-6">
        {products.length === 0 ? (
          <EmptyState
            variant="wishlist"
            image={NoFavoriteIllustration}
            title="Nothing to show here"
            subtitle="The products in this shared wishlist are unavailable, or the link is incomplete."
            altText="Empty shared wishlist"
            primaryAction={
              <Button variant="default" asChild>
                <Link href={config.routes.collection}>Browse collections</Link>
              </Button>
            }
          />
        ) : (
          <ProductsList layout="grid" products={products} />
        )}
      </div>
    </>
  );
};

export default SharedWishlistPage;
