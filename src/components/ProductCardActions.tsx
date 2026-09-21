'use client';

import { useState } from 'react';

import useUserContext from '@/contexts/UserContext/useUserContext';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import { Button } from './ui/button';
import QuickBuy from './QuickBuy';
import SpinnerLoader from './SpinnerLoader';

import { Heart } from 'lucide-react';

type ProductCardActionsProps = {
  product: ProductFieldsFragment;
  productId: string;
};

const ProductCardActions = ({ product, productId }: ProductCardActionsProps) => {
  const { userWishlist, handleSetWishlist } = useUserContext();
  const [loading, setLoading] = useState(false);

  const isWishlisted = userWishlist?.find((item) => item.id === productId);

  const handleWishlist = async () => {
    setLoading(true);
    try {
      await handleSetWishlist(!!isWishlisted, product);
    } catch (error) {
      console.error('Error updating wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col gap-2.5 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
      <Button
        variant="ghost"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        disabled={loading}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/60 bg-background/90 text-secondary shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-background hover:text-foreground ${
          isWishlisted ? 'text-destructive' : ''
        } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
        type="button"
        onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
          event.stopPropagation();
          event.preventDefault();
          handleWishlist();
        }}
      >
        {loading ? (
          <SpinnerLoader size="sm" />
        ) : (
          <Heart color="currentColor" className={isWishlisted ? 'fill-destructive' : ''} />
        )}
      </Button>

      <QuickBuy product={product} />
    </div>
  );
};

export default ProductCardActions;
