import type { ProductRecommendationsQuery } from '@/shopify/storefront';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';
import ProductCardDefault from './ProductCardDefault';

const ProductRecommendations = ({
  recommendations,
}: {
  recommendations: ProductRecommendationsQuery;
}) => {
  if (!recommendations?.productRecommendations?.length) {
    return null;
  }

  return (
    <Carousel>
      <CarouselContent>
        {recommendations.productRecommendations.map((product) => (
          <CarouselItem key={product.id} className="basis-1/2 sm:basis-1/3 lg:basis-1/4">
            <ProductCardDefault product={product} priority={false} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:absolute" />
      <CarouselNext className="hidden md:absolute" />
    </Carousel>
  );
};
export default ProductRecommendations;
