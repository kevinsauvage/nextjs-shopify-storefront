'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  createWishlistShareLinkAction,
  getWishlistProductsAction,
} from '@/actions/wishlistActions';
import NoFavoriteIllustration from '@/assets/NoFavoriteIllustration.png';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import EmptyState from '@/components/EmptyState';
import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import ProductsList from '@/components/ProductsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import useCartContext from '@/contexts/CartContext/useCartContext';
import useUserContext from '@/contexts/UserContext/useUserContext';
import { reportError } from '@/lib/logger';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import { Loader2, Share2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

const WishlistContent = () => {
  const { wishlistIds, wishlistReady, handleMoveToCart, pendingWishlistIds } = useUserContext();
  const { setCart } = useCartContext();
  const [fetched, setFetched] = useState<ProductFieldsFragment[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!wishlistIds.length) return;

    let cancelled = false;

    getWishlistProductsAction(wishlistIds)
      .then((items) => {
        if (cancelled) return;
        setFetched(items);
      })
      .catch((error) => {
        reportError('wishlist/products', error);
      })
      .finally(() => {
        if (cancelled) return;
        setProductsLoaded(true);
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

  // Products that are currently purchasable — the set "move to cart" acts on.
  const availableIds = useMemo(
    () =>
      products
        .filter((product) => product.variants?.edges?.[0]?.node?.availableForSale !== false)
        .map((product) => product.id),
    [products],
  );

  const handleShare = async () => {
    setSharing(true);

    try {
      const result = await createWishlistShareLinkAction(wishlistIds);

      if (!result.success || !result.url) {
        toast.error(result.message || 'Something went wrong');
        return;
      }

      // Prefer the native share sheet (mobile); fall back to the clipboard.
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: 'My wishlist', url: result.url });
        return;
      }

      await navigator.clipboard.writeText(result.url);
      toast.success('Wishlist link copied to clipboard');
    } catch (error) {
      // AbortError = the user dismissed the share sheet; not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      reportError('wishlist/share', error);
      toast.error('Could not share your wishlist');
    } finally {
      setSharing(false);
    }
  };

  const handleMoveAllToCart = async () => {
    if (availableIds.length === 0) {
      toast.info('None of your wishlisted items are available right now');
      return;
    }

    setMoving(true);

    try {
      // Sync the returned cart into the context so the header badge updates.
      const cart = await handleMoveToCart(availableIds);
      if (cart) setCart(cart);
    } finally {
      setMoving(false);
    }
  };

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
        <CardContent className="py-8">
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

  const busy = moving || pendingWishlistIds.length > 0;

  return (
    <Card>
      <CardHeaderPattern
        as="h2"
        title={`Wishlist (${wishlistIds.length})`}
        size={3}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              type="button"
              onClick={handleMoveAllToCart}
              disabled={busy || availableIds.length === 0}
            >
              {moving ? <Loader2 className="animate-spin" size={16} /> : <ShoppingBag size={16} />}
              Move all to cart
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={handleShare}
              disabled={sharing || wishlistIds.length === 0}
            >
              {sharing ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
              Share
            </Button>
          </div>
        }
        description={`You have ${wishlistIds.length} ${wishlistIds.length === 1 ? 'item' : 'items'} saved in your wishlist.`}
      />
      <CardContent>
        <ProductsList loading={!productsLoaded} layout="grid" products={products} />
      </CardContent>
    </Card>
  );
};

export default WishlistContent;
