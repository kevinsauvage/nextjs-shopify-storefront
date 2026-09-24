import { formatPrice } from '@/utils/format';

type Price = { amount: string; currencyCode: string };

type ProductPriceProps = {
  price?: Price | null;
  compareAtPrice?: Price | null;
  /** From `useProductVariantView` — the single definition of "on sale". */
  hasDiscount: boolean;
  priceClassName?: string;
  compareAtPriceClassName?: string;
};

/**
 * Price + compare-at strikethrough shared by the PDP and the quick view.
 * Layout (and badges) stay in the caller; only the discount gating lives here
 * so the two surfaces cannot drift.
 */
const ProductPrice = ({
  price,
  compareAtPrice,
  hasDiscount,
  priceClassName,
  compareAtPriceClassName,
}: ProductPriceProps) => (
  <>
    {price ? (
      <span className={priceClassName}>{formatPrice(price.amount, price.currencyCode)}</span>
    ) : null}
    {hasDiscount && compareAtPrice ? (
      <span className={compareAtPriceClassName}>
        {formatPrice(compareAtPrice.amount, compareAtPrice.currencyCode)}
      </span>
    ) : null}
  </>
);

export default ProductPrice;
