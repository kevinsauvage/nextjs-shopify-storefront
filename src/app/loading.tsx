import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import SectionTitle from '@/components/SectionTitle';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <div className="pb-16 md:pb-24">
      {/* Hero banner */}
      <div className="container mx-auto flex flex-col items-center px-4 py-14 text-center md:px-6 md:py-20">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-12 w-full max-w-xl" />
        <Skeleton className="mt-5 h-5 w-full max-w-2xl" />
      </div>

      {/* Featured collections (bento, matching CollectionGrid) */}
      <div className="container mx-auto px-4 md:px-6">
        <Skeleton className="mb-3 h-4 w-20" />
        <Skeleton className="mb-10 h-9 w-72" />
        <ul className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:gap-4 md:auto-rows-[240px] md:grid-cols-4 md:gap-5 lg:auto-rows-[280px] lg:gap-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <li
              key={`collection-${index + 1}`}
              className={index === 0 ? 'col-span-2 row-span-2' : ''}
            >
              <Skeleton className="media-frame skeleton-shimmer h-full w-full rounded-[var(--radius)] bg-muted" />
            </li>
          ))}
        </ul>
      </div>

      {/* Best sellers + new arrivals */}
      <div className="container mx-auto space-y-4 px-4 pt-16 md:space-y-8 md:px-6">
        <div>
          <Skeleton className="mb-3 h-4 w-20" />
          <SectionTitle>
            <Skeleton className="h-9 w-64" />
          </SectionTitle>
          <ProductGridSkeleton count={4} className="mb-0" />
        </div>
        <div>
          <Skeleton className="mb-3 h-4 w-16" />
          <SectionTitle>
            <Skeleton className="h-9 w-56" />
          </SectionTitle>
          <ProductGridSkeleton count={4} className="mb-0" />
        </div>
      </div>
    </div>
  );
};

export default Loading;
