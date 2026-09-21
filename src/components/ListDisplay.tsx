import { cn } from '@/utils/cn';

import ProductCardSkeleton from './ProductCardSkeleton';

type ListDisplayProps = {
  children?: React.ReactNode;
  layout?: 'grid' | 'list';
  /** Render skeleton cards instead of `children`. */
  loading?: boolean;
  /** Number of skeleton cards to render while loading. */
  skeletonCount?: number;
  className?: string;
};

/**
 * Owns the list element for product grids and lists, so item components
 * (and skeletons) never have to render their own `<li>`.
 */
const ListDisplay = ({
  children,
  layout = 'grid',
  loading = false,
  skeletonCount = 8,
  className,
}: ListDisplayProps) => {
  return (
    <ul
      className={cn(
        'gap-4 md:gap-6 lg:gap-8',
        layout === 'grid'
          ? 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]'
          : 'flex flex-col',
        className,
      )}
    >
      {loading
        ? Array.from({ length: skeletonCount }).map((_, index) => (
            <li key={`skeleton-product-${index + 1}`}>
              <ProductCardSkeleton />
            </li>
          ))
        : children}
    </ul>
  );
};

export default ListDisplay;
