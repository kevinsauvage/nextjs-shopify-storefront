#!/usr/bin/env node
/**
 * Shopify metaobject helper (Admin API) — manage the `popular_search_term`
 * metaobject that curates the "Popular:" chips on the storefront `/search` page
 * (see `src/lib/server/popularSearches.ts`).
 *
 * Values come from `.env.local` (`SHOPIFY_ADMIN_URL` +
 * `SHOPIFY_STORE_FRONT_ADMIN_TOKEN`) and are never printed.
 *
 * Usage:
 *   node bin/shopify-metaobjects.mjs list
 *   node bin/shopify-metaobjects.mjs ensure
 *   node bin/shopify-metaobjects.mjs seed [--manifest content/popular-searches.json]
 *
 * `ensure` creates the definition (single-line `term` field, storefront
 * `PUBLIC_READ`) when missing. `seed` upserts one entry per term, so the
 * metaobject is readable by the Storefront API immediately.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const ADMIN_URL = process.env.SHOPIFY_ADMIN_URL;
const ADMIN_TOKEN = process.env.SHOPIFY_STORE_FRONT_ADMIN_TOKEN;

if (!ADMIN_URL || !ADMIN_TOKEN) {
  console.error(
    'Missing SHOPIFY_ADMIN_URL or SHOPIFY_STORE_FRONT_ADMIN_TOKEN in .env.local. ' +
      'See .env.example (Admin API section).',
  );
  process.exit(2);
}

const TYPE = 'popular_search_term';
const FIELD_KEY = 'term';

const adminRequest = async (query, variables = {}) => {
  const response = await fetch(ADMIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Admin API responded with HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(`Admin API errors: ${JSON.stringify(payload.errors)}`);
  }

  return payload.data;
};

const throwOnUserErrors = (result, operation) => {
  const userErrors = result?.userErrors ?? [];

  if (userErrors.length > 0) {
    throw new Error(`${operation} rejected: ${JSON.stringify(userErrors)}`);
  }
};

const listDefinitions = async () => {
  const data = await adminRequest(
    `query { metaobjectDefinitions(first: 50) { edges { node { name type } } } }`,
  );

  const defs = data.metaobjectDefinitions.edges.map((edge) => edge.node);

  if (defs.length === 0) {
    console.info('No metaobject definitions found.');
    return;
  }

  for (const def of defs) {
    console.info(`${def.type}  —  ${def.name}`);
  }
};

const getDefinition = async () => {
  const data = await adminRequest(
    `query GetDef($type: String!) { metaobjectDefinitionByType(type: $type) { id name type } }`,
    { type: TYPE },
  );

  return data.metaobjectDefinitionByType ?? null;
};

const ensureDefinition = async () => {
  const existing = await getDefinition();

  if (existing) {
    console.info(`exists     ${existing.type}  —  ${existing.name}`);
    return;
  }

  const data = await adminRequest(
    `mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id name type }
        userErrors { field message code }
      }
    }`,
    {
      definition: {
        access: { storefront: 'PUBLIC_READ' },
        fieldDefinitions: [
          {
            key: FIELD_KEY,
            name: 'Term',
            required: true,
            type: 'single_line_text_field',
          },
        ],
        name: 'Popular search term',
        type: TYPE,
      },
    },
  );

  throwOnUserErrors(data.metaobjectDefinitionCreate, 'metaobjectDefinitionCreate');
  const created = data.metaobjectDefinitionCreate.metaobjectDefinition;
  console.info(`created    ${created.type}  —  ${created.name}`);
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const upsertTerm = async (term) => {
  const handle = slugify(term);

  if (!handle) {
    throw new Error(`Cannot derive a handle from term "${term}"`);
  }

  const data = await adminRequest(
    `mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { handle type }
        userErrors { field message code }
      }
    }`,
    {
      handle: { handle, type: TYPE },
      metaobject: { fields: [{ key: FIELD_KEY, value: term }] },
    },
  );

  throwOnUserErrors(data.metaobjectUpsert, 'metaobjectUpsert');
  console.info(`upserted   ${term}`);
};

const seedTerms = async (options) => {
  await ensureDefinition();

  const manifestPath = resolve(process.cwd(), options.manifest || 'content/popular-searches.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!Array.isArray(manifest.terms)) {
    throw new Error(`Invalid manifest ${manifestPath}: expected a "terms" array.`);
  }

  for (const term of manifest.terms) {
    if (typeof term !== 'string' || !term.trim()) {
      throw new Error(`Invalid term in ${manifestPath}: ${JSON.stringify(term)}`);
    }

    await upsertTerm(term.trim());
  }
};

const parseArgs = (args) => {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;

    options[arg.slice(2)] = args[index + 1];
    index += 1;
  }

  return options;
};

const [command, ...rest] = process.argv.slice(2);
const options = parseArgs(rest);

try {
  if (command === 'list') {
    await listDefinitions();
  } else if (command === 'ensure') {
    await ensureDefinition();
  } else if (command === 'seed') {
    await seedTerms(options);
  } else {
    console.error('Usage: shopify-metaobjects.mjs <list|ensure|seed> [options]');
    process.exit(2);
  }
} catch (error) {
  console.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
