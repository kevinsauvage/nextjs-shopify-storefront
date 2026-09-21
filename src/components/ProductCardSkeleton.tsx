import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

type ProductCardSkeletonProps = {
  /** Show action buttons (wishlist / quick add) — product grid cards only. */
  showActions?: boolean;
  /** Show a badge (discount / sold out) — product grid cards only. */
  showBadge?: boolean;
  /** Extra classes for the root element. */
  className?: string;
  /** `card` for the product grid, `row` for cart line items. */
  variant?: 'card' | 'row';
};

/**
 * Loading placeholder that mirrors the real product card exactly: 3:4 media
 * frame, vendor line, two-line title, price — so the swap to real content
 * causes no layout shift.
 *
 * Renders only the card *content* (no `<li>`), because it is always placed by
 * a parent that already owns the list element.
 */
const ProductCardSkeleton = ({
  showActions = true,
  showBadge = false,
  className,
  variant = 'card',
}: ProductCardSkeletonProps) => {
  if (variant === 'row') {
    // Horizontal layout for cart line items: image + two text lines.
    return (
      <div className={cn('flex gap-4', className)}>
        <Skeleton className="h-[120px] w-[90px] shrink-0 rounded-[var(--radius)]" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative flex flex-col', className)}>
      <div className="media-frame skeleton-shimmer relative aspect-[3/4] w-full bg-muted" />

      {/* Action affordances (wishlist + quick add) */}
      {showActions ? (
        <div className="absolute right-3 top-3 flex flex-col gap-2" aria-hidden="true">
          <Skeleton className="size-11 rounded-full" />
        </div>
      ) : null}

      {/* Badge */}
      {showBadge ? (
        <Skeleton className="absolute left-3 top-3 h-6 w-16 rounded-full" aria-hidden="true" />
      ) : null}

      {/* Meta: vendor + two-line title + price */}
      <div className="flex flex-1 flex-col pt-4">
        <Skeleton className="h-3 w-20" />
        <div className="mt-2 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="mt-3 h-5 w-20" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
