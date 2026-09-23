import type { Metadata } from 'next';
import Link from 'next/link';

import NotFoundIllustration from '@/assets/NotFoundIllustration.png';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import config from '@/config';

// `global-not-found` renders outside the root layout (requires
// `experimental.globalNotFound`), so the global stylesheet is imported here
// just like in `global-error.tsx`. No providers, fonts, or navigation are
// available — keep this static and dependency-light.
import '../styles/globals.css';

export const metadata: Metadata = {
  description: "The page you're looking for doesn't exist or may have been moved.",
  robots: { index: false, follow: false },
  title: 'Page not found',
};

const GlobalNotFound = () => {
  return (
    <html lang="en">
      <body>
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 min-h-screen flex items-center justify-center">
          <EmptyState
            variant="error"
            altText="Page not found illustration"
            image={NotFoundIllustration}
            subtitle="The page you're looking for doesn't exist or may have been moved."
            title="Page not found"
            primaryAction={
              <Button asChild variant="default">
                <Link href={config.routes.home}>Go home</Link>
              </Button>
            }
            secondaryAction={
              <Link href={config.routes.collection} className="link">
                Browse the collection
              </Link>
            }
          />
        </div>
      </body>
    </html>
  );
};

export default GlobalNotFound;
