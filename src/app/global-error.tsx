'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import NotFoundIllustration from '@/assets/NotFoundIllustration.png';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/logger';

const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    reportError('app/global-error-boundary', error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 min-h-screen flex items-center justify-center">
          <EmptyState
            variant="error"
            altText="Error illustration"
            image={NotFoundIllustration}
            subtitle="A critical error occurred. Please refresh the page or contact support if the problem continues."
            title="Critical error"
            tips={[
              'Refresh the page',
              'Clear browser cache and cookies',
              'Contact support if the problem continues',
            ]}
            primaryAction={
              <Button onClick={reset} variant="default">
                Try again
              </Button>
            }
            secondaryAction={
              <Link href="/" className="link">
                Go home
              </Link>
            }
          />
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
