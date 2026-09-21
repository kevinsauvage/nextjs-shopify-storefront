'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { getWishlistProductsAction } from '@/actions/wishlistActions';
import NoFavoriteIllustration from '@/assets/NoFavoriteIllustration.png';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import EmptyState from '@/components/EmptyState';
import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import ProductsList from '@/components/ProductsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import useUserContext from '@/contexts/UserContext/useUserContext';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import BackButton from '../../_components/BackButton';

const WishlistContent = () => {
  const { wishlistIds, wishlistReady } = useUserContext();
  const [fetched, setFetched] = useState<ProductFieldsFragment[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    if (!wishlistIds.length) return;

    let cancelled = false;

    getWishlistProductsAction(wishlistIds)
      .then((items) => {
        if (cancelled) return;
        setFetched(items);
        setProductsLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load wishlist products:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [wishlistIds]);

  // Filter optimistically so removed items disappear before the refetch lands.
  const products = useMemo(
    () => fetched.filter((product) => wishlistIds.includes(product.id)),
    [fetched, wishlistIds],
  );

  if (!wishlistReady) {
    return (
      <Card>
        <CardHeaderPattern
          title={<Skeleton className="h-8 w-40" />}
          description={<Skeleton className="h-4 w-full" />}
          actions={<Skeleton className="h-11 w-24" />}
        />
        <CardContent>
          <ProductGridSkeleton count={4} className="mb-0" />
        </CardContent>
      </Card>
    );
  }

  if (!wishlistIds.length) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            variant="wishlist"
            image={NoFavoriteIllustration}
            title="Your wishlist is empty"
            subtitle="Save your favorite items for later. Click the heart icon on any product to add it to your wishlist."
            altText="Empty wishlist"
            primaryAction={
              <Button variant="default" asChild>
                <Link href="/">Start Shopping</Link>
              </Button>
            }
            secondaryAction={
              <Link href="/collections" className="link">
                Browse collections
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeaderPattern
        title={`Wishlist (${wishlistIds.length})`}
        size={3}
        actions={<BackButton />}
        description={`You have ${wishlistIds.length} ${wishlistIds.length === 1 ? 'item' : 'items'} saved in your wishlist.`}
      />
      <CardContent>
        <ProductsList loading={!productsLoaded} layout="grid" products={products} />
      </CardContent>
    </Card>
  );
};

export default WishlistContent;
