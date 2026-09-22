import type { GetProductByHandleQuery } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { mapShopifyImagesToImageFields } from '@/utils/images';
import { sanitizeHtml } from '@/utils/sanitize';

import { Badge } from './ui/badge';
import PhotoGallery from './PhotoGallery';
import ProductDescriptionClient from './ProductDescriptionClient';

type ProductDescriptionProps = {
  product: GetProductByHandleQuery['product'];
  isModal?: boolean;
  className?: string;
};

const ProductDescription = ({ product, isModal, className }: ProductDescriptionProps) => {
  if (!product) return null;

  const { images } = product;
  const descriptionHtml = sanitizeHtml(
    typeof product.descriptionHtml === 'string' ? product.descriptionHtml : '',
  );

  // Get default variant data for initial render (server-side)
  const defaultVariant = product.variants?.edges?.[0]?.node
    ? {
        quantityAvailable: product.variants.edges[0].node.quantityAvailable,
        availableForSale: product.variants.edges[0].node.availableForSale,
        price: product.variants.edges[0].node.price,
        compareAtPrice: product.variants.edges[0].node.compareAtPrice,
        sku: product.variants.edges[0].node.sku,
        title: product.variants.edges[0].node.title,
        weight: product.variants.edges[0].node.weight,
        weightUnit: product.variants.edges[0].node.weightUnit,
      }
    : {
        quantityAvailable: null,
        availableForSale: false,
        price: undefined,
        compareAtPrice: undefined,
        sku: null,
        title: undefined,
        weight: null,
        weightUnit: undefined,
      };

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

        {!availableForSale && (
          <Badge
            variant="destructive"
            className="absolute right-4 top-4 z-10 px-3 py-1.5 text-body-sm font-medium shadow-md"
          >
            Sold Out
          </Badge>
        )}

        {quantityAvailable && quantityAvailable < 5 && availableForSale && (
          <Badge
            variant="secondary"
            className="absolute right-4 top-4 z-10 px-3 py-1.5 text-body-sm font-medium shadow-md"
          >
            Low Stock: {quantityAvailable} left
          </Badge>
        )}
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
