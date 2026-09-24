#!/usr/bin/env node
/**
 * Shopify content helper (Admin API) — manage the CMS pages rendered by
 * `src/app/pages/[handle]/page.tsx`.
 *
 * Values are read from `.env.local` (`SHOPIFY_ADMIN_URL` +
 * `SHOPIFY_STORE_FRONT_ADMIN_TOKEN`) and never printed: output only contains
 * page handles, titles and ids.
 *
 * Usage:
 *   node bin/shopify-content.mjs list
 *   node bin/shopify-content.mjs upsert --handle about-us --title "About us" --file content/pages/about-us.html [--draft]
 *   node bin/shopify-content.mjs seed [--manifest content/pages.json]
 *   node bin/shopify-content.mjs pull --handle about-us [--file content/pages/about-us.html]
 *
 * `seed` upserts every entry of the manifest (create when the handle is
 * missing, otherwise update in place) and publishes unless `--draft` is set.
 *
 * Sync is explicit in both directions: edits made in Shopify Admin do NOT flow
 * back automatically — run `pull` to bring them into the repo before the next
 * seed overwrites them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
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

const findPageByHandle = async (handle) => {
  const data = await adminRequest(
    `query findPage($query: String!) {
      pages(first: 5, query: $query) {
        edges { node { id handle title isPublished updatedAt } }
      }
    }`,
    { query: `handle:${handle}` },
  );

  return data.pages.edges.map((edge) => edge.node).find((node) => node.handle === handle) ?? null;
};

const listPages = async () => {
  const data = await adminRequest(
    `query listPages {
      pages(first: 50) {
        edges { node { handle title isPublished updatedAt } }
      }
    }`,
  );

  const pages = data.pages.edges.map((edge) => edge.node);

  if (pages.length === 0) {
    console.info('No pages found.');
    return;
  }

  for (const page of pages) {
    console.info(
      `${page.isPublished ? 'published' : 'draft    '}  /pages/${page.handle}  —  ${page.title}`,
    );
  }
};

const upsertPage = async ({ handle, title, file, draft = false }) => {
  const body = readFileSync(resolve(process.cwd(), file), 'utf8');

  if (!body.trim()) {
    throw new Error(`Refusing to publish empty content from ${file}`);
  }

  const existing = await findPageByHandle(handle);

  if (!existing) {
    const data = await adminRequest(
      `mutation createPage($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page { id handle title isPublished }
          userErrors { field message }
        }
      }`,
      { page: { handle, title, body, isPublished: !draft } },
    );

    throwOnUserErrors(data.pageCreate, 'pageCreate');

    const created = data.pageCreate.page;
    console.info(
      `created    /pages/${created.handle}  —  ${created.title} (${created.isPublished ? 'published' : 'draft'})`,
    );
    return;
  }

  const data = await adminRequest(
    `mutation updatePage($id: ID!, $page: PageUpdateInput!) {
      pageUpdate(id: $id, page: $page) {
        page { id handle title isPublished }
        userErrors { field message }
      }
    }`,
    { id: existing.id, page: { title, body, isPublished: !draft } },
  );

  throwOnUserErrors(data.pageUpdate, 'pageUpdate');

  const updated = data.pageUpdate.page;
  console.info(
    `updated    /pages/${updated.handle}  —  ${updated.title} (${updated.isPublished ? 'published' : 'draft'})`,
  );
};

const parseArgs = (args) => {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);

    if (key === 'draft') {
      options.draft = true;
      continue;
    }

    options[key] = args[index + 1];
    index += 1;
  }

  return options;
};

const seedPages = async (options) => {
  const manifestPath = resolve(process.cwd(), options.manifest || 'content/pages.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!Array.isArray(manifest.pages)) {
    throw new Error(`Invalid manifest ${manifestPath}: expected a "pages" array.`);
  }

  for (const page of manifest.pages) {
    if (!page.handle || !page.title || !page.file) {
      throw new Error(
        `Invalid manifest entry (handle/title/file required): ${JSON.stringify(page)}`,
      );
    }

    await upsertPage({
      handle: page.handle,
      title: page.title,
      file: page.file,
      draft: options.draft === true,
    });
  }
};

const pullPage = async ({ handle, file, manifest: manifestOption }) => {
  let targetFile = file;

  if (!targetFile) {
    const manifest = readManifest(manifestOption);
    const entry = manifest.pages.find((page) => page.handle === handle);

    if (!entry) {
      console.error(
        `Handle "${handle}" is not in content/pages.json — pass --file <path> to pull it somewhere explicit.`,
      );
      process.exit(2);
    }

    targetFile = entry.file;
  }

  const data = await adminRequest(
    `query pullPage($query: String!) {
      pages(first: 5, query: $query) {
        edges { node { id handle title body } }
      }
    }`,
    { query: `handle:${handle}` },
  );

  const page =
    data.pages.edges.map((edge) => edge.node).find((node) => node.handle === handle) ?? null;

  if (!page) {
    throw new Error(`No Shopify page with handle "${handle}" — nothing to pull.`);
  }

  const targetPath = resolve(process.cwd(), targetFile);
  writeFileSync(targetPath, `${page.body.trim()}\n`);

  console.info(`pulled     /pages/${page.handle}  —  ${page.title} → ${targetFile}`);
};

const readManifest = (manifestOption) => {
  const manifestPath = resolve(process.cwd(), manifestOption || 'content/pages.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (!Array.isArray(manifest.pages)) {
    throw new Error(`Invalid manifest ${manifestPath}: expected a "pages" array.`);
  }

  return manifest;
};

const [command, ...rest] = process.argv.slice(2);
const options = parseArgs(rest);

try {
  if (command === 'list') {
    await listPages();
  } else if (command === 'seed') {
    await seedPages(options);
  } else if (command === 'upsert') {
    const { handle, title, file, draft } = options;

    if (!handle || !title || !file) {
      console.error('Usage: upsert --handle <handle> --title <title> --file <path> [--draft]');
      process.exit(2);
    }

    await upsertPage({ handle, title, file, draft: draft === true });
  } else if (command === 'pull') {
    const { handle, file, manifest } = options;

    if (!handle) {
      console.error('Usage: pull --handle <handle> [--file <path>]');
      process.exit(2);
    }

    await pullPage({ handle, file, manifest });
  } else {
    console.error('Usage: shopify-content.mjs <list|seed|upsert|pull> [options]');
    process.exit(2);
  }
} catch (error) {
  console.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
