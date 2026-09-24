import type { ProductVariantView } from '@/hooks/useProductVariantView';
import type { GetProductByHandleQuery } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { mapShopifyImagesToImageFields } from '@/utils/images';
import { isLowStock, isSoldOut } from '@/utils/inventory';
import { sanitizeHtmlCached } from '@/utils/sanitize';

import { Badge } from './ui/badge';
import PhotoGallery from './PhotoGallery';
import ProductDescriptionClient from './ProductDescriptionClient';

type ProductDescriptionProps = {
  product: GetProductByHandleQuery['product'];
  isModal?: boolean;
  className?: string;
};

const FALLBACK_VARIANT: ProductVariantView = {
  quantityAvailable: null,
  availableForSale: false,
  price: undefined,
  compareAtPrice: undefined,
  sku: null,
  title: undefined,
  weight: null,
  weightUnit: undefined,
};

/** Project the first variant edge onto the shared `ProductVariantView` shape. */
const getDefaultVariant = (
  product: NonNullable<GetProductByHandleQuery['product']>,
): ProductVariantView => {
  const node = product.variants?.edges?.[0]?.node;
  if (!node) return FALLBACK_VARIANT;

  const {
    quantityAvailable,
    availableForSale,
    price,
    compareAtPrice,
    sku,
    title,
    weight,
    weightUnit,
  } = node;

  return {
    quantityAvailable,
    availableForSale,
    price,
    compareAtPrice,
    sku,
    title,
    weight,
    weightUnit,
  };
};

const ProductDescription = async ({ product, isModal, className }: ProductDescriptionProps) => {
  if (!product) return null;

  const { images } = product;
  const descriptionHtml = await sanitizeHtmlCached(
    typeof product.descriptionHtml === 'string' ? product.descriptionHtml : '',
  );

  // Default variant data for initial render (server-side)
  const defaultVariant = getDefaultVariant(product);

  const productImages = mapShopifyImagesToImageFields(images?.edges);

  const { quantityAvailable, availableForSale } = defaultVariant;

  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-12 relative',
        className,
      )}
    >
      <div className="relative lg:col-span-7">
        <PhotoGallery images={productImages} />

        {isSoldOut(availableForSale) ? (
          <Badge
            variant="destructive"
            className="absolute right-4 top-4 z-10 px-3 py-1.5 text-body-sm font-medium shadow-md"
          >
            Sold Out
          </Badge>
        ) : null}

        {isLowStock(quantityAvailable, availableForSale) ? (
          <Badge
            variant="secondary"
            className="absolute right-4 top-4 z-10 px-3 py-1.5 text-body-sm font-medium shadow-md"
          >
            Low Stock: {quantityAvailable} left
          </Badge>
        ) : null}
      </div>

      <ProductDescriptionClient
        product={product}
        isModal={isModal}
        defaultVariant={defaultVariant}
        descriptionHtml={descriptionHtml}
        productId={product.id}
      />
    </div>
  );
};

export default ProductDescription;
