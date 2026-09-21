import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getNextPath, getPreviousPath } from '@/shopify/helpers';
import type { PageInfo } from '@/shopify/storefront';

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
      <Link
        href={previousPath}
        className={pageInfo.hasPreviousPage ? '' : 'cursor-not-allowed'}
        aria-disabled={!pageInfo.hasPreviousPage}
        aria-label="Previous Page"
      >
        <Button
          disabled={!pageInfo.hasPreviousPage}
          variant="secondary"
          size="default"
          asChild={false}
          aria-disabled={!pageInfo.hasPreviousPage}
          aria-label="Previous Page"
        >
          Previous
        </Button>
      </Link>

      <Link
        href={nextPath}
        className={pageInfo.hasNextPage ? '' : 'cursor-not-allowed'}
        aria-disabled={!pageInfo.hasNextPage}
        aria-label="Next Page"
      >
        <Button
          disabled={!pageInfo.hasNextPage}
          variant="secondary"
          size="default"
          asChild={false}
          aria-disabled={!pageInfo.hasNextPage}
          aria-label="Next Page"
        >
          Next
        </Button>
      </Link>
    </div>
  );
};

export default PageInfoPagination;
