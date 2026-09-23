import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import BackButton from '../_components/BackButton';

/**
 * Skeleton for the account-update segment. The page reads the customer
 * (`cookies()` + an uncached Storefront fetch) at the top of its render, so
 * under Cache Components this boundary provides the static shell while the
 * private data streams in.
 */
const Loading = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeaderPattern
          as="h2"
          className="w-full"
          size={3}
          title={<Skeleton className="h-8 w-56" />}
          description={<Skeleton className="h-5 w-full max-w-xl" />}
          actions={<BackButton />}
        />
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`field-${index + 1}`} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-11 w-full sm:w-40" />
        </CardContent>
      </Card>

      <Card>
        <CardHeaderPattern
          as="h2"
          className="w-full"
          size={4}
          title={<Skeleton className="h-6 w-48" />}
          description={<Skeleton className="h-4 w-full max-w-lg" />}
        />
        <CardContent>
          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`stat-${index + 1}`} className="space-y-2 rounded-xl border p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Loading;
