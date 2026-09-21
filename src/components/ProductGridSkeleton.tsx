import ListDisplay from '@/components/ListDisplay';
import { cn } from '@/utils/cn';

type ProductGridSkeletonProps = {
  count?: number;
  className?: string;
};

/**
 * Skeleton grid matching `ProductsList` (the grid element is owned by
 * `ListDisplay`), so page-level `loading.tsx` files get the same rhythm as the
 * real content and the swap causes no layout shift.
 */
const ProductGridSkeleton = ({ count = 8, className }: ProductGridSkeletonProps) => (
  <ListDisplay layout="grid" loading skeletonCount={count} className={cn('mb-12', className)}>
    {null}
  </ListDisplay>
);

export default ProductGridSkeleton;
