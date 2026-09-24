import { getClientIp, UNKNOWN_IP } from '@/lib/server/client-ip';
import { getDelegateAccessToken } from '@/lib/server/delegate-token';

import type { PageInfo, ProductFilter } from './storefront';

interface PaginationVariables {
  after?: string;
  before?: string;
  first?: number;
  last?: number;
  [key: string]: unknown; // To allow any other additional properties
}

export const adjustPaginationVariables = ({
  after,
  before,
  first,
  ...rest
}: PaginationVariables): PaginationVariables => {
  const count = first ?? 10;

  return {
    ...rest,
    after: after || undefined, // Cursor for next page
    before: before || undefined, // Cursor for previous page
    // Forward unless paging backward from a `before` cursor.
    first: before && !after ? undefined : count,
    last: before ? count : undefined,
  };
};

const parseFilterValue = (value: string | undefined): ProductFilter | undefined => {
  if (!value) return undefined;

  const [, jsonPart] = value.split(/:(.+)/);
  if (!jsonPart) return undefined;

  try {
    const parsed = JSON.parse(jsonPart);
    return parsed && typeof parsed === 'object' ? (parsed as ProductFilter) : undefined;
  } catch {
    // Ignore malformed user-supplied filters instead of crashing the page.
    return undefined;
  }
};

export const parseFiltersQuery = (filters: string | Array<string> | undefined): ProductFilter[] => {
  if (!filters) return [];

  const values = Array.isArray(filters) ? filters : [filters];

  return values
    .map(parseFilterValue)
    .filter((filter): filter is ProductFilter => filter !== undefined);
};

export const buildExtraHeaders = async (
  headers: Record<string, string>,
): Promise<Record<string, string>> => {
  const userIp = await getClientIp();
  const buyerIp = userIp !== UNKNOWN_IP ? userIp : undefined;
  const delegateToken = await getDelegateAccessToken();

  const extraHeaders: Record<string, string> = {
    ...(buyerIp ? { 'Shopify-Storefront-Buyer-IP': buyerIp } : {}),
    ...(delegateToken ? { 'Shopify-Storefront-Private-Token': delegateToken } : {}),
  };

  return {
    ...extraHeaders,
    ...headers,
    'Content-Type': 'application/json',
  };
};

export const buildShopifySearchQuery = (query: string) => {
  if (!query) {
    return '';
  }
  const trimmed = query.trim();

  if (trimmed.includes(' ')) {
    return `"${trimmed}"`;
  }

  return `${trimmed}*`;
};

export const getNextPath = (
  pageInfo: PageInfo,
  searchParameters: {
    after?: string;
    before?: string;
    sort_key?: string;
  },
  basePath: string,
): string => {
  if (!pageInfo.hasNextPage) {
    return '';
  }

  const newSearchParameters = new URLSearchParams(searchParameters);
  if (pageInfo.endCursor) {
    newSearchParameters.set('after', pageInfo.endCursor);
  }
  newSearchParameters.delete('before');

  return `${basePath}?${newSearchParameters.toString()}`;
};

export const getPreviousPath = (
  pageInfo: PageInfo,
  searchParameters: {
    after?: string;
    before?: string;
    sort_key?: string;
  },
  basePath: string,
): string => {
  if (!pageInfo.hasPreviousPage) {
    return '';
  }

  const newSearchParameters = new URLSearchParams(searchParameters);
  if (pageInfo.startCursor) {
    newSearchParameters.set('before', pageInfo.startCursor);
  }
  newSearchParameters.delete('after');

  return `${basePath}?${newSearchParameters.toString()}`;
};
