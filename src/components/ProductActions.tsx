'use client';

import useUserContext from '@/contexts/UserContext/useUserContext';
import { cn } from '@/utils/cn';

import { Button } from './ui/button';

import { Heart, ShoppingBag } from 'lucide-react';

type ProductActionsProps = {
  productId: string;
  availableForSale: boolean;
  onAddToCart: () => void;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  /** The current option combination does not exist. */
  unavailable?: boolean;
};

/**
 * Add-to-cart + wishlist controls shared by the PDP and the quick-view sheet.
 * `compact` renders the icon-only variant used inside the sheet.
 */
const ProductActions = ({
  productId,
  availableForSale,
  onAddToCart,
  disabled,
  loading = false,
  compact = false,
  unavailable = false,
}: ProductActionsProps) => {
  const { wishlistIds, handleSetWishlist } = useUserContext();
  const isWishlisted = wishlistIds.includes(productId);
  const isPurchasable = availableForSale && !unavailable;

  const label = unavailable ? 'Unavailable' : availableForSale ? 'Add to Cart' : 'Sold Out';

  return (
    <div className={cn('flex w-full', compact ? 'gap-2' : 'gap-3')}>
      <Button
        className={cn('flex-1', compact ? 'h-12 text-body-lg font-semibold gap-2' : 'gap-2')}
        size="lg"
        loading={loading}
        disabled={disabled || !isPurchasable}
        onClick={onAddToCart}
      >
        <ShoppingBag className="h-5 w-5" color="currentColor" />
        {label}
      </Button>

      <Button
        variant={isWishlisted ? 'default' : 'outline'}
        size="lg"
        className={compact ? 'h-12 w-12' : 'gap-2'}
        onClick={() => {
          handleSetWishlist(isWishlisted, productId);
        }}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart className={cn('h-5 w-5', isWishlisted && 'fill-current')} />
        {!compact && (
          <span className="sr-only md:not-sr-only">{isWishlisted ? 'Saved' : 'Save'}</span>
        )}
      </Button>
    </div>
  );
};

export default ProductActions;
