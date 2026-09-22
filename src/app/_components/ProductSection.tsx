import Link from 'next/link';

import ProductsList from '@/components/ProductsList';
import { Button } from '@/components/ui/button';
import config from '@/config';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import HomeSection from './HomeSection';

import { ArrowRight } from 'lucide-react';

type ProductSectionProps = {
  title: string;
  eyebrow?: string;
  products: ProductFieldsFragment[];
  viewAllLink?: string;
  viewAllLabel?: string;
  className?: string;
};

const ProductSection = ({
  title,
  eyebrow,
  products,
  viewAllLink = config.routes.collection,
  viewAllLabel = 'View all products',
  className,
}: ProductSectionProps) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <HomeSection
      title={title}
      eyebrow={eyebrow}
      className={className}
      action={
        <Button variant="outline" size="sm" className="group" asChild>
          <Link href={viewAllLink}>
            {viewAllLabel}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </Button>
      }
    >
      <ProductsList products={products} layout="grid" />
    </HomeSection>
  );
};

export default ProductSection;
