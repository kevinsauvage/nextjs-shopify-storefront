import Breadcrumbs from '@/components/Breadcrumbs';
import ListingHeader from '@/components/ListingHeader';
import PageBanner from '@/components/PageBanner';
import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import seo from '@/data/seo';

const Loading = () => {
  return (
    <div>
      <PageBanner title={seo.search.title} description={seo.search.description}>
        <Breadcrumbs />
        <Skeleton className="mx-auto h-11 w-full max-w-lg" />
      </PageBanner>

      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <ListingHeader>
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-28" />
          </div>
        </ListingHeader>
        <ProductGridSkeleton count={8} className="mb-0" />
      </div>
    </div>
  );
};

export default Loading;
