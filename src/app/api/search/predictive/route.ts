import { type NextRequest } from 'next/server';

import { getClientIp } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { storefrontSdk } from '@/shopify';
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  HTTP_STATUS,
} from '@/utils/api-responses';

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const RATE_LIMIT_TOKENS = 30;
const RATE_LIMIT_WINDOW = '1 m';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (query.length < MIN_QUERY_LENGTH) {
    return createSuccessResponse({ predictiveSearch: null });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return createErrorResponse('Query too long', {
      message: 'Search query is too long.',
      status: HTTP_STATUS.BAD_REQUEST,
    });
  }

  const ip = await getClientIp();
  if (await isRateLimited('search:predictive', ip, RATE_LIMIT_TOKENS, RATE_LIMIT_WINDOW)) {
    return createErrorResponse('Rate limit exceeded', {
      message: 'Rate limit exceeded. Please try again in a moment.',
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
    });
  }

  try {
    const response = await storefrontSdk().predictiveSearch({ query });

    if (!response) {
      return createSuccessResponse({ predictiveSearch: null });
    }

    return createSuccessResponse(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return handleApiError(
      'GET /api/search/predictive',
      error,
      'Failed to fetch predictive search results',
    );
  }
}
