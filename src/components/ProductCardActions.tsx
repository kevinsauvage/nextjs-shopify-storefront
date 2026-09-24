'use client';

import { useState } from 'react';

import useUserContext from '@/contexts/UserContext/useUserContext';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { cn } from '@/utils/cn';

import { Button } from './ui/button';
import QuickBuy from './QuickBuy';
import SpinnerLoader from './SpinnerLoader';

import { Heart } from 'lucide-react';

type ProductCardActionsProps = {
  product: ProductFieldsFragment;
  productId: string;
};

/**
 * Card overlay actions: a wishlist toggle (top-right) and a quick-add button
 * (bottom) that both reveal on hover / keyboard focus on pointer devices and
 * stay visible on touch.
 */
const ProductCardActions = ({ product, productId }: ProductCardActionsProps) => {
  const { wishlistIds, handleSetWishlist } = useUserContext();
  const [loading, setLoading] = useState(false);

  const isWishlisted = wishlistIds.includes(productId);

  const handleWishlist = async () => {
    setLoading(true);
    try {
      // `handleSetWishlist` reports failures itself and never rejects.
      await handleSetWishlist(isWishlisted, productId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute right-3 top-3">
        <Button
          variant="ghost"
          type="button"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
          disabled={loading}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            handleWishlist();
          }}
          className={cn(
            'pointer-events-auto flex size-11 items-center justify-center rounded-full border border-border/50 bg-background/85 text-secondary shadow-sm backdrop-blur-md transition-all duration-300',
            'hover:scale-105 hover:bg-background hover:text-foreground',
            'md:translate-y-1 md:opacity-0 md:group-hover/card:translate-y-0 md:group-hover/card:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100',
            isWishlisted && 'text-destructive hover:text-destructive',
          )}
        >
          {loading ? (
            <SpinnerLoader size="sm" />
          ) : (
            <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />
          )}
        </Button>
      </div>

      <div className="absolute inset-x-3 bottom-3">
        <QuickBuy
          product={product}
          triggerLabel="Quick add"
          triggerClassName={cn(
            'pointer-events-auto w-full',
            'md:translate-y-2 md:opacity-0 md:group-hover/card:translate-y-0 md:group-hover/card:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100',
          )}
        />
      </div>
    </div>
  );
};

export default ProductCardActions;
