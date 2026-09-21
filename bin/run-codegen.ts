import { generate } from '@graphql-codegen/cli';

import 'dotenv/config'; // should be at the very top

import configAdmin from '../codegen.admin';
import configStorefront from '../codegen.storefront';

const generateSchemas = async () => {
  await generate(configStorefront, true);
  console.info('✅ Storefront Codegen complete');

  if (!configAdmin) {
    console.warn(
      '⚠️  Skipping Admin Codegen: SHOPIFY_ADMIN_URL / SHOPIFY_STORE_FRONT_ADMIN_TOKEN are not set.',
    );
    return;
  }

  await generate(configAdmin, true);
  console.info('✅ Admin Codegen complete');
};

generateSchemas()
  .then(() => {
    console.info('✅ Codegen complete');
  })
  .catch((error) => {
    console.error('❌ Codegen failed', error);
    process.exit(1);
  });
