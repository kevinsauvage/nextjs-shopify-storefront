import Link from 'next/link';

import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import config from '@/config';

/**
 * Shown when Shopify has no published policy for a legal page, so visitors
 * get guidance and a contact path instead of an empty card.
 */
const PolicyFallback = () => (
  <EmptyState
    variant="error"
    title="Policy unavailable"
    subtitle="We couldn't load this policy right now. Please try again in a moment, or contact us and we'll help."
    altText="Policy unavailable"
    tips={['Refresh the page and try again', 'Contact our support team for a copy']}
    primaryAction={
      <Button variant="default" asChild>
        <Link href={config.routes.contact}>Contact us</Link>
      </Button>
    }
  />
);

export default PolicyFallback;
