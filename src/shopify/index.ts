import config from '@/config';
import { safeLogError } from '@/utils/api-responses';

import type { SdkFunctionWrapper } from './storefront/index';
import { getSdk as getStorefrontSdk } from './storefront/index';
import { buildExtraHeaders } from './helpers';

import { GraphQLClient } from 'graphql-request';

type GraphQLClientOptions = ConstructorParameters<typeof GraphQLClient>[1];

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

const defaultWrapper: SdkFunctionWrapper = async (
  action,
  _operationName,
  _operationType,
  _variables: Record<string, unknown>,
) => {
  const extraHeader = await buildExtraHeaders({});

  try {
    return await action(extraHeader);
  } catch (error) {
    safeLogError(`GraphQL request - ${_operationName}`, {
      operationType: _operationType,
      variables: _variables,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const storefrontSdk = (cacheOption: 'default' | 'no-store' = 'default') => {
  const client = cacheOption === 'no-store' ? createStorefrontClient('no-store') : storefrontClient;
  return getStorefrontSdk(client, defaultWrapper);
};

export { adminSdk } from './admin-client';
