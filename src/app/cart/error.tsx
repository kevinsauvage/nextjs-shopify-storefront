'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import NotFoundIllustration from '@/assets/NotFoundIllustration.png';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/logger';

const CartError = ({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) => {
  useEffect(() => {
    reportError('app/cart-error-boundary', error, { digest: error.digest });
  }, [error]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 min-h-[calc(100vh-76px)] flex items-center justify-center">
      <EmptyState
        variant="error"
        altText="Cart error illustration"
        image={NotFoundIllustration}
        subtitle="We couldn't load your cart. Please try again or contact support if the problem continues."
        title="Unable to load cart"
        tips={[
          'Try refreshing the page',
          'Your cart items are saved',
          'Contact support if the problem continues',
        ]}
        primaryAction={
          <Button onClick={() => retry()} variant="default">
            Try again
          </Button>
        }
        secondaryAction={
          <Link href="/" className="link">
            Continue shopping
          </Link>
        }
      />
    </div>
  );
};

export default CartError;
