import { cookies } from 'next/headers';

import config from '@/config';
import { getDelegateAccessToken } from '@/lib/server/delegate-token';
import { getCurrentUrlWithoutParameters } from '@/lib/server/url-helpers';

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
  const variables: PaginationVariables = {
    ...rest,
    after: after || undefined, // Cursor for next page
    before: before || undefined, // Cursor for previous page
    first: after ? first || 10 : undefined, // Forward pagination
    last: before ? first || 10 : undefined, // Backward pagination
  };

  if (!after && !before) {
    variables.first = first || 10; // Default to forward pagination
  }

  return variables;
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
  const cookiesStore = await cookies();

  const userIp = cookiesStore.get(config.cookies.userIp)?.value;
  const delegateToken = await getDelegateAccessToken();

  const extraHeaders: Record<string, string> = {
    'Shopify-Storefront-Buyer-IP': userIp || '',
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

export const getNextPath = async (
  pageInfo: PageInfo,
  searchParameters: {
    after?: string;
    before?: string;
    sort_key?: string;
  },
) => {
  if (!pageInfo.hasNextPage) {
    return '';
  }

  const currentUrl = await getCurrentUrlWithoutParameters();
  const newSearchParameters = new URLSearchParams(searchParameters);
  if (pageInfo.endCursor) {
    newSearchParameters.set('after', pageInfo.endCursor);
  }
  newSearchParameters.delete('before');

  return `${currentUrl}?${newSearchParameters.toString()}`;
};

export const getPreviousPath = async (
  pageInfo: PageInfo,
  searchParameters: {
    after?: string;
    before?: string;
    sort_key?: string;
  },
) => {
  if (!pageInfo.hasPreviousPage) {
    return '';
  }
  const currentUrl = await getCurrentUrlWithoutParameters();
  const newSearchParameters = new URLSearchParams(searchParameters);
  if (pageInfo.startCursor) {
    newSearchParameters.set('before', pageInfo.startCursor);
  }
  newSearchParameters.delete('after');

  return `${currentUrl}?${newSearchParameters.toString()}`;
};
