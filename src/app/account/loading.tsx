import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeaderPattern
          className="w-full"
          size={3}
          title={<Skeleton className="h-8 w-56" />}
          description={<Skeleton className="h-5 w-full max-w-xl" />}
        />
        <CardContent className="space-y-6">
          {/* Account stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`stat-${index + 1}`} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>

          {/* Recent orders preview */}
          <div className="space-y-3 border-t pt-4">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={`order-${index + 1}`} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>

          {/* CTA cards */}
          <div className="grid grid-cols-1 justify-items-stretch gap-4 pt-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`cta-${index + 1}`}
                className="space-y-4 rounded-[var(--radius)] border p-4 md:p-6"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-11 w-full sm:w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Loading;
