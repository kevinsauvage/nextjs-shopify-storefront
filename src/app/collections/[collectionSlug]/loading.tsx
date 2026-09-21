import { Skeleton } from '@/components/ui/skeleton';

/**
 * Collection page hero skeleton. Renders the collection page's structure
 * (breadcrumb bar, portrait hero, sibling nav, toolbar) before the product
 * grid streams in.
 */
const Loading = () => {
  return (
    <div className="pb-16 md:pb-24">
      <div className="border-b border-border/60 bg-secondary/30">
        <div className="container mx-auto px-4 py-3 md:px-6">
          <Skeleton className="h-5 w-48" />
        </div>
      </div>

      <section className="relative isolate overflow-hidden">
        <Skeleton className="h-[40vh] min-h-[300px] w-full rounded-none bg-muted md:h-[52vh] md:min-h-[420px]" />
      </section>

      <div className="border-b border-border/60">
        <div className="container mx-auto flex gap-6 px-4 py-4 md:px-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`nav-${index + 1}`} className="h-5 w-24" />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-border/60 pb-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-28" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
};

export default Loading;
