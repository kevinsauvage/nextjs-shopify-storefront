import CardHeaderPattern from '@/components/CardHeaderPattern';
import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
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
  );
};

export default Loading;
