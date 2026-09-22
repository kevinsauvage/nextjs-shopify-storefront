import { cn } from '@/utils/cn';

const ListingHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={cn('mb-6 flex items-end justify-between gap-2', className)}>{children}</div>;

export default ListingHeader;
