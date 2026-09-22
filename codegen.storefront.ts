import type { CodegenConfig } from '@graphql-codegen/cli';

const getStorefrontSchemaUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL;

  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL environment variable. ' +
        'Set it to your Shopify Storefront API endpoint (e.g., https://your-store.myshopify.com/api/2026-07/graphql.json)',
    );
  }

  return url;
};

const getAccessToken = (): string => {
  const accessToken = process.env.SHOPIFY_STORE_FRONT_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      'Missing SHOPIFY_STORE_FRONT_ACCESS_TOKEN environment variable. ' +
        'This is required for GraphQL schema introspection.',
    );
  }

  return accessToken;
};

const storefrontSchemaUrl = getStorefrontSchemaUrl();
const accessToken = getAccessToken();

const config: CodegenConfig = {
  documents: 'src/shopify/storefront/**/*.graphql',
  generates: {
    'src/shopify/storefront/index.ts': {
      config: {
        scalars: {
          Color: 'string',
          DateTime: 'string',
          Decimal: 'string',
          HTML: 'string',
          ISO8601DateTime: 'string',
          JSON: 'any',
          URL: 'string',
          UnsignedInt64: 'string',
        },
      },
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
    },
  },
  hooks: { afterAllFileWrite: ['prettier --write'] },
  schema: {
    [storefrontSchemaUrl]: {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': accessToken,
      },
    },
  },
};

export default config;
