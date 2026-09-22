import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * The Admin API is optional for storefront-only deployments (see
 * `src/shopify/admin-client.ts`), so Admin codegen must not block the pipeline
 * when its credentials are absent. When they are missing we skip generation and
 * keep the committed `src/shopify/admin/index.ts`.
 */
const getAdminEnv = (): { token: string; url: string } | null => {
  const url = process.env.SHOPIFY_ADMIN_URL;
  const token = process.env.SHOPIFY_STORE_FRONT_ADMIN_TOKEN;

  if (!url || !token) return null;

  return { token, url };
};

const adminEnv = getAdminEnv();

const config: CodegenConfig | null = adminEnv
  ? {
      config: {
        fragmentMasking: false,
        gqlTagName: 'gql',
      },
      documents: 'src/shopify/admin/**/*.graphql',
      generates: {
        'src/shopify/admin/index.ts': {
          plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
          config: {
            /**
             * The React app only consumes a couple of Admin operations. Without
             * this the `typescript` plugin emits the entire Admin schema, which
             * is ~60k lines; `onlyOperationTypes` restricts the output to the
             * types reachable from the queries in `src/shopify/admin/**`.
             */
            onlyOperationTypes: true,
            scalars: {
              ARN: 'string',
              BigInt: 'string',
              Color: 'string',
              Date: 'string',
              DateTime: 'string',
              Decimal: 'string',
              FormattedString: 'string',
              HTML: 'string',
              JSON: 'any',
              Money: 'string',
              StorefrontID: 'string',
              URL: 'string',
              UnsignedInt64: 'string',
              UtcOffset: 'string',
            },
          },
        },
      },
      overwrite: true,
      schema: {
        [adminEnv.url]: {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': adminEnv.token,
          },
        },
      },
    }
  : null;

export default config;
