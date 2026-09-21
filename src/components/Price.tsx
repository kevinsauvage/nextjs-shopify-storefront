import type { MoneyV2, ProductFieldsFragment } from '@/shopify/storefront';
import { formatPrice } from '@/utils/format';

const Price = ({
  compareAtPrice,
  price,
  priceRange,
}: {
  compareAtPrice: MoneyV2 | undefined | null;
  price: MoneyV2 | undefined | null;
  priceRange?: ProductFieldsFragment['priceRange'];
}) => {
  const currentPrice = priceRange?.minVariantPrice ?? price ?? null;
  const isDiscount =
    !!compareAtPrice && !!currentPrice && compareAtPrice.amount !== currentPrice.amount;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {currentPrice && (
        <span className="text-body font-medium tracking-tight text-foreground">
          {formatPrice(currentPrice.amount, currentPrice.currencyCode)}
        </span>
      )}
      {isDiscount && compareAtPrice && (
        <span className="text-caption text-muted-foreground line-through">
          {formatPrice(compareAtPrice.amount, compareAtPrice.currencyCode)}
        </span>
      )}
    </div>
  );
};

export default Price;
