import ProductGridSkeleton from '@/components/ProductGridSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the product page: breadcrumb bar, 3:4 gallery (thumbnail rail +
 * stage), buy box, then the recommendations row — so nothing shifts when the
 * real product streams in.
 */
const Loading = () => {
  return (
    <div className="min-h-[calc(100vh-76px)]">
      <div className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <Skeleton className="h-5 w-56" />
        </div>
      </div>

      <section className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Gallery: vertical rail + stage on desktop, stage only on mobile */}
          <div className="lg:col-span-7 lg:grid lg:grid-cols-[76px_1fr] lg:items-start lg:gap-4">
            <div className="order-2 mt-3 flex gap-2 lg:order-1 lg:mt-0 lg:flex-col">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={`thumb-${index + 1}`}
                  className="aspect-[3/4] w-16 shrink-0 rounded-[calc(var(--radius)-2px)] lg:w-full"
                />
              ))}
            </div>
            <Skeleton className="order-1 aspect-[3/4] w-full bg-muted lg:order-2" />
          </div>

          {/* Buy box */}
          <div className="flex flex-col gap-8 lg:col-span-5">
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
            <div className="space-y-6 rounded-[var(--radius)] border border-border/70 p-6">
              <div className="flex gap-2.5">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="size-9 rounded-full" />
              </div>
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="flex gap-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="container mx-auto px-4 py-12 md:px-6 md:py-16">
          <Skeleton className="mb-3 h-4 w-20" />
          <Skeleton className="mb-10 h-9 w-64" />
          <ProductGridSkeleton count={4} className="mb-0" />
        </div>
      </section>
    </div>
  );
};

export default Loading;
