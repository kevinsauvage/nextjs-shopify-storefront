'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import NotFoundIllustration from '@/assets/NotFoundIllustration.png';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import config from '@/config';
import { reportError } from '@/lib/logger';

const ProductError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    reportError('app/product-error-boundary', error, { digest: error.digest });
  }, [error]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 min-h-[calc(100vh-76px)] flex items-center justify-center">
      <EmptyState
        variant="error"
        altText="Product error illustration"
        image={NotFoundIllustration}
        subtitle="We couldn't load this product. Please try again or browse our other products."
        title="Unable to load product"
        tips={['Try refreshing the page', 'Browse similar products', 'Check back later']}
        primaryAction={
          <Button onClick={reset} variant="default">
            Try again
          </Button>
        }
        secondaryAction={
          <Link href={config.routes.collection} className="link">
            Browse products
          </Link>
        }
      />
    </div>
  );
};

export default ProductError;
