import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getNextPath, getPreviousPath } from '@/shopify/helpers';
import type { PageInfo } from '@/shopify/storefront';
import { cn } from '@/utils/cn';

const PageInfoPagination = ({
  pageInfo,
  searchParameters,
  basePath,
}: {
  pageInfo: PageInfo;
  searchParameters: {
    after?: string;
    before?: string;
    sort_key?: string;
  };
  basePath: string;
}) => {
  const previousPath = getPreviousPath(pageInfo, searchParameters, basePath);
  const nextPath = getNextPath(pageInfo, searchParameters, basePath);
  return (
    <div className="flex items-center justify-between gap-2">
      {pageInfo.hasPreviousPage ? (
        <Button asChild variant="secondary" size="default">
          <Link href={previousPath} aria-label="Previous Page">
            Previous
          </Link>
        </Button>
      ) : (
        <Button variant="secondary" size="default" disabled aria-label="Previous Page">
          Previous
        </Button>
      )}

      {pageInfo.hasNextPage ? (
        <Button asChild variant="secondary" size="default">
          <Link href={nextPath} aria-label="Next Page">
            Next
          </Link>
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="default"
          disabled
          aria-label="Next Page"
          className={cn('cursor-not-allowed')}
        >
          Next
        </Button>
      )}
    </div>
  );
};

export default PageInfoPagination;
