'use client';

import Link from 'next/link';

import config from '@/config';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { mapShopifyImagesToImageFields } from '@/utils/images';

import { Badge } from './ui/badge';
import OptimizedImage from './OptimizedImage';
import Price from './Price';
import ProductCardActions from './ProductCardActions';

const isWhatPercentOf = (x: number, y: number) => (((x - y) / y) * 100).toFixed(0);

type ProductCardDefaultProps = {
  product: ProductFieldsFragment;
  priority: boolean;
  asListItem?: boolean;
};

const ProductCardDefault = ({ product, priority, asListItem = true }: ProductCardDefaultProps) => {
  const { title, images, handle, variants, id, priceRange } = product;
  const { price, compareAtPrice, availableForSale, quantityAvailable } =
    variants?.edges?.[0]?.node || {};

  const productImages = mapShopifyImagesToImageFields(images?.edges);
  const primaryImage = productImages?.[0];

  const isLowStock = quantityAvailable && quantityAvailable < 5 && availableForSale;
  const isSoldOut = !availableForSale;

  const Component = asListItem ? 'li' : 'div';

  return (
    <Component className="group relative">
      <ProductCardActions product={product} productId={id} />

      <Link
        className="block cursor-pointer focus-visible:outline-none"
        href={`${config.routes.collection}/products/${handle}`}
        scroll
      >
        <div className="media-frame relative aspect-square">
          <OptimizedImage
            src={primaryImage?.medium || primaryImage?.small || primaryImage?.src || ''}
            alt={primaryImage?.altText || title}
            width={500}
            height={500}
            blurDataURL={primaryImage?.blurDataURL}
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
            quality={75}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            aria-label={`Image of ${title}`}
          />

          {/* Discount Badge */}
          {compareAtPrice && price?.amount !== compareAtPrice?.amount && (
            <Badge variant="destructive" className="absolute left-3 top-3 z-10">
              -{isWhatPercentOf(Number(price?.amount), Number(compareAtPrice?.amount))}%
            </Badge>
          )}

          {/* Availability Indicators */}
          {isSoldOut && (
            <Badge
              variant="secondary"
              className="absolute left-3 top-3 z-10 border border-border/50"
            >
              Sold Out
            </Badge>
          )}
          {isLowStock && !isSoldOut && (
            <Badge variant="secondary" className="absolute left-3 top-3 z-10">
              Low Stock
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-1.5 pt-4">
          <h3 className="text-body font-medium leading-snug text-foreground line-clamp-2">
            {title}
          </h3>
          <Price compareAtPrice={compareAtPrice} priceRange={priceRange} price={price} />
        </div>
      </Link>
    </Component>
  );
};

export default ProductCardDefault;
