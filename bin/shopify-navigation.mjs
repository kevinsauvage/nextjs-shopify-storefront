#!/usr/bin/env node
/**
 * Shopify navigation helper (Admin API) — manage the menus rendered by the
 * storefront (`main-menu` in the header, `footer` in the footer via
 * `getMenuByHandle`).
 *
 * Values are read from `.env.local` (`SHOPIFY_ADMIN_URL` +
 * `SHOPIFY_STORE_FRONT_ADMIN_TOKEN`) and never printed: output only contains
 * menu handles, titles and URLs.
 *
 * Usage:
 *   node bin/shopify-navigation.mjs list
 *   node bin/shopify-navigation.mjs show --handle footer
 *   node bin/shopify-navigation.mjs sync [--manifest content/navigation.json]
 *
 * `sync` is declarative: every menu in the manifest is created when its handle
 * is missing, otherwise updated wholesale (title + full item tree). Menus NOT
 * in the manifest are never touched.
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

const adminRequest = async (query, variables = {}) => {
  const response = await fetch(ADMIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
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

const ITEM_TREE = `title url type items { title url type items { title url type items { title url type } } }`;

const listMenus = async () => {
  const data = await adminRequest(
    `query listMenus { menus(first: 20) { edges { node { handle title } } } }`,
  );

  const menus = data.menus.edges.map((edge) => edge.node);

  if (menus.length === 0) {
    console.info('No menus found.');
    return;
  }

  for (const menu of menus) {
    console.info(`${menu.handle}  —  ${menu.title}`);
  }
};

const getMenuByHandle = async (handle) => {
  const data = await adminRequest(
    `query getMenu($query: String!) {
      menus(first: 20, query: $query) {
        edges { node { id handle title items { ${ITEM_TREE} } } }
      }
    }`,
    { query: `handle:${handle}` },
  );

  return data.menus.edges.map((edge) => edge.node).find((node) => node.handle === handle) ?? null;
};

const printTree = (items, depth) => {
  for (const item of items ?? []) {
    console.info(`${' '.repeat(depth)}- ${item.title} -> ${item.url}`);
    printTree(item.items, depth + 2);
  }
};

const showMenu = async (handle) => {
  const menu = await getMenuByHandle(handle);

  if (!menu) {
    throw new Error(`No menu with handle "${handle}".`);
  }

  console.info(`${menu.handle}  —  ${menu.title}`);
  printTree(menu.items, 2);
};

/** Manifest items only carry title/url(/items); the Admin API gets explicit HTTP types. */
const toInput = (items) =>
  (items ?? []).map((item) => ({
    title: item.title,
    url: item.url,
    type: 'HTTP',
    ...(item.items ? { items: toInput(item.items) } : {}),
  }));

const syncMenus = async (options) => {
  const manifestPath = resolve(process.cwd(), options.manifest || 'content/navigation.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!Array.isArray(manifest.menus)) {
    throw new Error(`Invalid manifest ${manifestPath}: expected a "menus" array.`);
  }

  for (const menu of manifest.menus) {
    if (!menu.handle || !menu.title || !Array.isArray(menu.items)) {
      throw new Error(
        `Invalid manifest entry (handle/title/items required): ${JSON.stringify(menu)}`,
      );
    }

    const existing = await getMenuByHandle(menu.handle);

    if (!existing) {
      const data = await adminRequest(
        `mutation createMenu($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
          menuCreate(title: $title, handle: $handle, items: $items) {
            menu { handle title }
            userErrors { field message }
          }
        }`,
        { title: menu.title, handle: menu.handle, items: toInput(menu.items) },
      );

      throwOnUserErrors(data.menuCreate, 'menuCreate');
      console.info(`created    ${data.menuCreate.menu.handle}  —  ${data.menuCreate.menu.title}`);
      continue;
    }

    const data = await adminRequest(
      `mutation updateMenu($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, title: $title, items: $items) {
          menu { handle title }
          userErrors { field message }
        }
      }`,
      { id: existing.id, title: menu.title, items: toInput(menu.items) },
    );

    throwOnUserErrors(data.menuUpdate, 'menuUpdate');
    console.info(`updated    ${data.menuUpdate.menu.handle}  —  ${data.menuUpdate.menu.title}`);
  }
};

const parseArgs = (args) => {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    options[key] = args[index + 1];
    index += 1;
  }

  return options;
};

const [command, ...rest] = process.argv.slice(2);
const options = parseArgs(rest);

try {
  if (command === 'list') {
    await listMenus();
  } else if (command === 'show') {
    if (!options.handle) {
      console.error('Usage: show --handle <handle>');
      process.exit(2);
    }

    await showMenu(options.handle);
  } else if (command === 'sync') {
    await syncMenus(options);
  } else {
    console.error('Usage: shopify-navigation.mjs <list|show|sync> [options]');
    process.exit(2);
  }
} catch (error) {
  console.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
