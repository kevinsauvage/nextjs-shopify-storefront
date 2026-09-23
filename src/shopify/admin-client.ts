import 'server-only';

import { getSdk as getAdminSdk } from './admin/index';

import { GraphQLClient } from 'graphql-request';

const ADMIN_TOKEN = process.env.SHOPIFY_STORE_FRONT_ADMIN_TOKEN;
const ADMIN_URL = process.env.SHOPIFY_ADMIN_URL;

let adminClient: GraphQLClient | null = null;

/**
 * Returns the Shopify Admin GraphQL client, creating it on first use.
 *
 * The Admin API is optional: storefront-only deployments should boot without
 * Admin credentials. The error is thrown lazily, only when an Admin-backed
 * feature is actually used.
 */
export const getAdminClient = (): GraphQLClient => {
  if (!ADMIN_URL || !ADMIN_TOKEN) {
    throw new Error(
      'Shopify Admin API is not configured. Set SHOPIFY_ADMIN_URL and ' +
        'SHOPIFY_STORE_FRONT_ADMIN_TOKEN to use Admin-backed features ' +
        '(e.g. wishlist metafields).',
    );
  }

  adminClient ??= new GraphQLClient(ADMIN_URL, {
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
  });

  return adminClient;
};

export const adminSdk = () => getAdminSdk(getAdminClient());
