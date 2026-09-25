import CardHeaderPattern from '@/components/CardHeaderPattern';
import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <Card>
        <CardHeaderPattern
          title={<Skeleton className="h-8 w-44" />}
          description={<Skeleton className="h-4 w-full" />}
          actions={<Skeleton className="h-11 w-28" />}
        />
        <CardContent>
          <ProductGridSkeleton count={4} className="mb-0" />
        </CardContent>
      </Card>
    </div>
  );
};

export default Loading;
