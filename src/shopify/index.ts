import config from '@/config';
import { safeLogError } from '@/utils/api-responses';

import type { SdkFunctionWrapper } from './storefront/index';
import { getSdk as getStorefrontSdk } from './storefront/index';
import { buildExtraHeaders } from './helpers';

import { GraphQLClient } from 'graphql-request';

type GraphQLClientOptions = ConstructorParameters<typeof GraphQLClient>[1];

/**
 * Storefront SDK access mode.
 *
 * - `public`: catalog reads. No request context (cookies, buyer IP, delegate
 *   token) is attached, so routes that only use these operations can be
 *   statically rendered and cached.
 * - `private`: customer-specific operations. Attaches the buyer IP + delegate
 *   token and bypasses the cache. Only safe from Server Actions, Route Handlers
 *   or dynamic routes, because it reads cookies.
 */
type StorefrontMode = 'public' | 'private';

const ACCESS_TOKEN = process.env.SHOPIFY_STORE_FRONT_ACCESS_TOKEN;
const SHOPIFY_URL = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL;

if (!ACCESS_TOKEN) {
  throw new Error('Missing SHOPIFY_STORE_FRONT_ACCESS_TOKEN');
}

if (!SHOPIFY_URL) {
  throw new Error('Missing NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL');
}

const createStorefrontClient = (cacheOption: 'default' | 'no-store' = 'default') => {
  const options = {
    fetch: async (url: string, parameters: RequestInit) => {
      const fetchOptions: RequestInit = {
        ...parameters,
      };

      if (cacheOption === 'no-store') {
        // Explicitly prevent caching for customer-specific data
        fetchOptions.cache = 'no-store';
        fetchOptions.next = { revalidate: 0 };
      } else {
        fetchOptions.next = { revalidate: config.constants.revalidate.shopify };
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`Failed to fetch from Shopify: ${response.statusText}`);
      }

      return response;
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': ACCESS_TOKEN,
    },
  };

  return new GraphQLClient(SHOPIFY_URL, options as GraphQLClientOptions);
};

const storefrontClient = createStorefrontClient('default');

const logRequestError = (
  operationName: string,
  operationType: string | undefined,
  variables: Record<string, unknown> | undefined,
  error: unknown,
) => {
  safeLogError(`GraphQL request - ${operationName}`, {
    operationType,
    variables,
    error: error instanceof Error ? error.message : String(error),
  });
};

/** Public catalog reads — context-free so they stay cacheable/static. */
const publicWrapper: SdkFunctionWrapper = async (
  action,
  operationName,
  operationType,
  variables: Record<string, unknown>,
) => {
  try {
    return await action({});
  } catch (error) {
    logRequestError(operationName, operationType, variables, error);
    throw error;
  }
};

/** Customer-specific reads/mutations — needs the request context. */
const privateWrapper: SdkFunctionWrapper = async (
  action,
  operationName,
  operationType,
  variables: Record<string, unknown>,
) => {
  const extraHeaders = await buildExtraHeaders({});

  try {
    return await action(extraHeaders);
  } catch (error) {
    logRequestError(operationName, operationType, variables, error);
    throw error;
  }
};

export const storefrontSdk = (mode: StorefrontMode = 'public') => {
  const isPrivate = mode === 'private';
  const client = isPrivate ? createStorefrontClient('no-store') : storefrontClient;

  return getStorefrontSdk(client, isPrivate ? privateWrapper : publicWrapper);
};

export { adminSdk } from './admin-client';
