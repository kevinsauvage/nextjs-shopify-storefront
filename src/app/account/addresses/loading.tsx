import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <Card>
      <CardHeaderPattern
        title={<Skeleton className="h-8 w-44" />}
        description={<Skeleton className="h-4 w-full" />}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-40" />
          </div>
        }
      />
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-address-${index + 1}`}
              className="flex items-start gap-4 rounded-xl border p-4 md:p-5"
            >
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex flex-1 items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
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
