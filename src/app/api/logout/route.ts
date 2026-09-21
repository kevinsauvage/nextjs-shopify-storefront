import { cookies } from 'next/headers';
import { type NextRequest } from 'next/server';

import config from '@/config';
import { clearShopifyToken, getShopifyToken } from '@/lib/server/shopify-helpers';
import { storefrontSdk } from '@/shopify';
import { createSuccessResponse, handleApiError, safeLogError } from '@/utils/api-responses';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  try {
    const token = await getShopifyToken();
    if (token) {
      try {
        await storefrontSdk('no-store').customerAccessTokenDelete({
          customerAccessToken: token,
        });
      } catch (error) {
        safeLogError('POST /api/logout - token deletion', error);
      }
    }

    await clearShopifyToken();

    const cookieStore = await cookies();
    cookieStore.delete(config.cookies.delegateToken);

    return createSuccessResponse({ success: 'Logged out successfully' });
  } catch (error) {
    return handleApiError('POST /api/logout', error, 'Failed to logout');
  }
}
