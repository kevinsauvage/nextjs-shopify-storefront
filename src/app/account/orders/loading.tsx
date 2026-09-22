import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <Card>
      <CardHeaderPattern
        title={<Skeleton className="h-8 w-40" />}
        description={<Skeleton className="h-4 w-full" />}
        actions={<Skeleton className="h-11 w-28" />}
      />
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-order-${index + 1}`}
              className="space-y-4 rounded-xl border p-4 md:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex items-center justify-between gap-4 pt-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-11 w-28" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-11 w-64 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
};

export default Loading;
