import type { ProductFieldsFragment } from '@/shopify/storefront';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';
import ProductCardDefault from './ProductCardDefault';

/**
 * Horizontal product rail shared by the recently-viewed and best-sellers
 * sections, so both keep one carousel + card layout.
 */
const ProductRail = ({ products }: { products: ProductFieldsFragment[] }) => {
  if (products.length === 0) return null;

  return (
    <Carousel>
      <CarouselContent>
        {products.map((product) => (
          <CarouselItem key={product.id} className="basis-1/2 sm:basis-1/3 lg:basis-1/4">
            <ProductCardDefault product={product} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:absolute" />
      <CarouselNext className="hidden md:absolute" />
    </Carousel>
  );
};

export default ProductRail;
