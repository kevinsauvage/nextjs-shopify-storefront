import Image from 'next/image';
import Link from 'next/link';

import config from '@/config';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { discountPercentOf, formatPrice, hasDiscountPrice } from '@/utils/format';
import { mapShopifyImagesToImageFields } from '@/utils/images';
import { isLowStock, isSoldOut } from '@/utils/inventory';

import { Badge } from './ui/badge';
import ProductCardActions from './ProductCardActions';

const CARD_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

type CardPrice = { amount: string; currencyCode: string } | null | undefined;

const getDiscountPercent = (price: CardPrice, compareAtPrice: CardPrice): string | null =>
  hasDiscountPrice(price, compareAtPrice) && price && compareAtPrice
    ? discountPercentOf(price.amount, compareAtPrice.amount)
    : null;

const CardBadges = ({
  soldOut,
  discountPercent,
  lowStock,
}: {
  soldOut: boolean;
  discountPercent: string | null;
  lowStock: boolean;
}) => {
  if (!soldOut && !discountPercent && !lowStock) return null;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
      {soldOut ? (
        <Badge variant="secondary" className="border-border/50 bg-background/90 backdrop-blur-md">
          Sold out
        </Badge>
      ) : null}
      {discountPercent ? <Badge variant="destructive">-{discountPercent}%</Badge> : null}
      {lowStock ? (
        <Badge variant="outline" className="border-border/60 bg-background/90 backdrop-blur-md">
          Low stock
        </Badge>
      ) : null}
    </div>
  );
};

const CardPriceLine = ({
  price,
  compareAtPrice,
  discounted,
}: {
  price: CardPrice;
  compareAtPrice: CardPrice;
  discounted: boolean;
}) => (
  <div className="mt-auto flex items-baseline gap-2 pt-2">
    {price ? (
      <span
        className={cn(
          'text-body font-semibold tabular-nums',
          discounted ? 'text-destructive' : 'text-foreground',
        )}
      >
        {formatPrice(price.amount, price.currencyCode)}
      </span>
    ) : null}
    {discounted && compareAtPrice ? (
      <span className="text-caption text-muted line-through tabular-nums">
        {formatPrice(compareAtPrice.amount, compareAtPrice.currencyCode)}
      </span>
    ) : null}
  </div>
);

type ProductCardDefaultProps = {
  product: ProductFieldsFragment;
  preload?: boolean;
  /** Classes applied to the card root (e.g. carousel item sizing). */
  className?: string;
};

/**
 * Editorial product card: portrait media frame, secondary image cross-fade on
 * hover, wishlist + quick-add actions, and a restrained meta block.
 *
 * Renders only card *content* — the surrounding `<li>`/grid cell is owned by
 * the parent (`ListDisplay`, `CarouselItem`), so no list element is nested.
 */
const ProductCardDefault = ({ product, preload = false, className }: ProductCardDefaultProps) => {
  const { title, images, handle, variants, id, priceRange, vendor, availableForSale } = product;
  const firstVariant = variants?.edges?.[0]?.node;
  const price = firstVariant?.price ?? priceRange?.minVariantPrice ?? null;
  const compareAtPrice = firstVariant?.compareAtPrice ?? null;
  const soldOut = isSoldOut(availableForSale) || !firstVariant?.availableForSale;
  const lowStock = isLowStock(firstVariant?.quantityAvailable, !soldOut);

  const productImages = mapShopifyImagesToImageFields(images?.edges);
  const primary = productImages[0];
  const secondary = productImages[1];

  const discounted = hasDiscountPrice(price, compareAtPrice);
  const discountPercentage = getDiscountPercent(price, compareAtPrice);

  // Template shape matches the dynamic product route, so `typedRoutes`
  // validates it at each `Link` call site.
  const href: `/collections/products/${string}` = `${config.routes.collection}/products/${handle}`;

  return (
    <div className={cn('group/card relative flex h-full flex-col', className)}>
      <div className="media-frame relative shadow-none transition-shadow duration-300 group-hover/card:shadow-lg group-hover/card:shadow-black/5">
        <Link
          href={href}
          aria-label={`View ${title}`}
          className="block rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
            {primary ? (
              <Image
                src={primary.medium || primary.src}
                alt={primary.altText || title || 'Product image'}
                fill
                preload={preload}
                quality={75}
                sizes={CARD_SIZES}
                placeholder={primary.blurDataURL ? 'blur' : 'empty'}
                blurDataURL={primary.blurDataURL || undefined}
                className={cn(
                  'object-cover transition-all duration-700 ease-out',
                  !soldOut && 'group-hover/card:scale-[1.05]',
                  secondary && !soldOut && 'group-hover/card:opacity-0',
                )}
              />
            ) : null}

            {secondary && !soldOut ? (
              <Image
                src={secondary.medium || secondary.src}
                alt=""
                fill
                quality={75}
                sizes={CARD_SIZES}
                className="absolute inset-0 object-cover opacity-0 transition-opacity duration-500 ease-out group-hover/card:opacity-100"
              />
            ) : null}

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/15 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
            />
          </div>
        </Link>

        <CardBadges soldOut={soldOut} discountPercent={discountPercentage} lowStock={lowStock} />

        <ProductCardActions product={product} productId={id} />
      </div>

      <div className="flex flex-1 flex-col pt-4">
        {vendor ? (
          <span className="text-caption-sm uppercase tracking-widest text-muted">{vendor}</span>
        ) : null}
        <h3 className="mt-1 text-body font-medium leading-snug text-foreground">
          <Link href={href} className="link-underline line-clamp-2">
            {title}
          </Link>
        </h3>
        <CardPriceLine price={price} compareAtPrice={compareAtPrice} discounted={discounted} />
      </div>
    </div>
  );
};

export default ProductCardDefault;
