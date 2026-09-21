'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { getWishlistProductsAction } from '@/actions/wishlistActions';
import NoFavoriteIllustration from '@/assets/NoFavoriteIllustration.png';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import EmptyState from '@/components/EmptyState';
import ProductsList from '@/components/ProductsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <CardContent className="space-y-4 py-8">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-40 w-full animate-pulse rounded bg-muted" />
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
