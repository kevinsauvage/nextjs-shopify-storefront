'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import NotFoundIllustration from '@/assets/NotFoundIllustration.png';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';

const AccountError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    console.error('Account error:', error);
  }, [error]);

  return (
    <Card>
      <CardContent className="py-12">
        <EmptyState
          variant="error"
          altText="Account error illustration"
          image={NotFoundIllustration}
          subtitle="We couldn't load your account information. Please try again or contact support if the problem continues."
          title="Unable to load account"
          tips={[
            'Try refreshing the page',
            'Clear your browser cache',
            'Contact support if the problem continues',
          ]}
          primaryAction={
            <Button onClick={reset} variant="default">
              Try again
            </Button>
          }
          secondaryAction={
            <Link href={config.routes.home} className="link">
              Go home
            </Link>
          }
        />
      </CardContent>
    </Card>
  );
};

export default AccountError;
