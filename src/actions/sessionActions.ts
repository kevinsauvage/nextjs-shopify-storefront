'use server';

import { hasShopifySession } from '@/lib/server/shopify-helpers';

/**
 * Resolve the customer session client-side so the root layout does not have to
 * read cookies (which would opt the whole catalog out of static rendering).
 */
export async function getSessionAction(): Promise<boolean> {
  return hasShopifySession();
}
