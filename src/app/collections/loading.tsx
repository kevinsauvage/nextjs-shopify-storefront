import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton grid for the collections index — mirrors the bento layout (one
 * large hero tile plus smaller tiles) so the swap to real collections causes
 * no layout shift.
 */
const Loading = () => {
  return (
    <div className="pb-16 md:pb-24">
      <div className="container mx-auto flex flex-col items-center px-4 py-14 text-center md:px-6 md:py-20">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-4 h-12 w-64" />
        <Skeleton className="mt-5 h-5 w-full max-w-2xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <ul className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:gap-4 md:auto-rows-[240px] md:grid-cols-4 md:gap-5 lg:auto-rows-[280px] lg:gap-6">
          {Array.from({ length: 7 }).map((_, index) => (
            <li
              key={`collection-${index + 1}`}
              className={index === 0 ? 'col-span-2 row-span-2' : ''}
            >
              <Skeleton className="media-frame skeleton-shimmer h-full w-full rounded-[var(--radius)] bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Loading;
