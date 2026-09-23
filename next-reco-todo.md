# next-reco-todo.md

Audit of this project against the **version-matched Next.js documentation bundled in
`node_modules/next/dist/docs/`**, per the agent rule that ships with Next.js
(`node_modules/next/AGENTS.md`: *"Read the relevant guide in `dist/docs/` before writing any code.
Heed deprecation notices."*).

## Why this file exists / what changed

The project was on `next@16.1.1`, which **does not bundle docs**. The bundled docs ship from
**16.2+** and are auto-referenced by `next dev` from **16.3+**. We bumped:

- `next` `^16.1.1` → `^16.3.6` (`package.json`, `yarn.lock`).
- Docs are now at `node_modules/next/dist/docs/` (456 markdown files).
- The old dev font failure (`Can't resolve '@vercel/turbopack-next/internal/font/google/font'` +
  `fonts.gstatic.com` connection error) **no longer reproduces** on 16.3.6.

Baseline gates after the bump (Node 24 via `.nvmrc`):

- `next build` ✅ (compiled in 8.5s, TypeScript ✅, 731 static pages)
- `next dev` ✅ (`/` and `/collections` return 200; no font/compile errors)
- No deprecated API patterns found by static scan (`next/legacy/image`, `images.domains`,
  `serverRuntimeConfig`, `experimental.turbopack`, `next lint`, `experimental_ppr`,
  `unstable_*`, `runtime = 'edge'`, `webpack:` config).

Legend: **P0** = upgrade hygiene · **P1** = high · **P2** = medium · ✅ compliant · ⚠️ partial · ❌ missing

---

## 0. Upgrade hygiene (do first)

- [ ] **P0 — Silence the Turbopack root warning.** `next dev`/`next build` both print:
      *"Next.js ignored pnpm-lock.yaml in /Users/ksauvage because it is outside the current Git
      repository. To use this directory, set `turbopack.root`."*
      Doc: `01-app/03-api-reference/05-config/01-next-config-js/turbopack.md` → *Root directory*.
      Fix in `next.config.ts`:
      ```ts
      turbopack: { root: import.meta.dirname }, // or path.resolve(process.cwd())
      ```
      (Root cause: a stray `pnpm-lock.yaml` in the home directory. Removing it also fixes this,
      but the docs' supported fix is `turbopack.root`.)

- [ ] **P0 — Commit the managed `AGENTS.md` block.** On 16.3+, `next dev` writes
      `<!-- BEGIN:nextjs-agent-rules -->` into `AGENTS.md`/`CLAUDE.md` at the project root. The repo
      has no root `AGENTS.md`/`CLAUDE.md`, so the block will be re-created as an uncommitted change
      every run. Doc: `01-app/02-guides/ai-agents.md`. Commit the generated files (or set
      `agentRules: false` in `next.config.ts` to opt out).

- [ ] **P0 — Drop the now-redundant Turbopack flags.** Turbopack is the default in 16; `--turbo`
      on `dev`/`build` is no longer needed. Doc: `01-app/02-guides/upgrading/version-16.md` →
      *Turbopack by default*.
      `package.json`: `"dev": "next dev --turbo"` → `"next dev"`, `"build": "yarn codegen && next
      build --turbo"` → `... next build`.

---

## 1. Caching & revalidation

Reference: `01-app/01-getting-started/08-caching.md`, `09-revalidating.md`,
`01-app/03-api-reference/01-directives/use-cache*.md`, `04-functions/cacheTag.md`,
`cacheLife.md`, `updateTag.md`, `revalidateTag.md`, `refresh.md`, `after.md`.

Current state: the app caches **only** through `fetch(..., { next: { revalidate } })` and segment
`export const revalidate`. There is **no** `use cache`, `cacheTag`, `cacheLife`, `revalidateTag`,
`updateTag`, or `refresh` usage anywhere (verified by scan). That is the "previous model"; the docs
now center on **Cache Components**.

- [ ] **P1 — Adopt Cache Components (`cacheComponents: true`).** Doc:
      `01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`. This is a migration,
      not a flag flip: it enables PPR/static shells and **removes** the `dynamic`, `dynamicParams`,
      `revalidate`, and `fetchCache` segment configs. Existing code that relies on those
      (`src/app/page.tsx:20`, `src/app/collections/page.tsx:12`,
      `src/app/collections/products/[productSlug]/page.tsx:15`, `src/app/sitemap.ts:7,9`, and the
      `force-dynamic` account routes) must be re-expressed with `use cache` + `<Suspense>`.
      Consider the `next-cache-components-adoption` skill from `01-app/02-guides/ai-agents.md`.
- [ ] **P1 — Tag Shopify fetches for precise invalidation.** `src/shopify/index.ts:41-46` sets
      `next.revalidate` but no `next.tags`. Add tags (`product:<handle>`, `collection:<handle>`,
      `menu`, …) and invalidate from a Shopify webhook with `revalidateTag(tag, 'max')`.
      Doc: `04-functions/cacheTag.md` / `revalidateTag.md`.
- [ ] **P1 — Use `updateTag` for read-your-own-writes mutations.** Cart/wishlist/address actions
      should `updateTag(...)` (Server-Action-only, immediate expiry) rather than relying on a full
      client refresh. Doc: `04-functions/updateTag.md`.
- [ ] **P2 — `revalidateTag` signature.** When introduced, the single-arg form is deprecated in 16 —
      always `revalidateTag(tag, 'max')` (or `{ expire: 0 }`). Doc: `revalidateTag.md`.
- [ ] **P2 — Use `after()` for post-response work.** Error reporting / analytics currently run inline
      (`src/lib/server/error-reporter.ts`, `src/instrumentation.ts`). `after()` from `next/server`
      schedules work without making the route dynamic. Doc: `04-functions/after.md`.
- [ ] **P2 — `refresh()` vs `revalidatePath`.** For cart badge/header counts, prefer `refresh()`
      inside the action. Doc: `04-functions/refresh.md`.

## 2. Error handling

Reference: `01-app/01-getting-started/10-error-handling.md`,
`03-api-reference/03-file-conventions/error.md`, `production-checklist.md`.

- [ ] **P1 — Migrate `error.tsx` from `reset` to `retry`.** `retry` became stable in **16.3.0** and
      is the documented default (it re-fetches; `reset` only clears state). All five boundaries use
      `reset`: `src/app/error.tsx:12,31`, `src/app/global-error.tsx:17,42`,
      `src/app/account/error.tsx:15,39`, `src/app/cart/error.tsx:11,30`,
      `src/app/collections/products/[productSlug]/error.tsx:14,33`.
      Doc: `error.md` → *`retry`* / *`reset`*.
- [ ] **P2 — Add `app/global-not-found.tsx`.** `not-found.tsx` exists at the root, but the
      production checklist calls for a global fallback for URLs matching no route at all.
      (Experimental; bypasses the layout, so re-import global styles/theme.) Doc:
      `03-file-conventions/not-found.md` → *`global-not-found.js`*,
      `production-checklist.md:87`.
- [ ] **P2 — Consider `catchError` for component-level recovery.** Doc:
      `04-functions/catchError.md`. ✅ Current `global-error.tsx` correctly renders its own
      `<html>`/`<body>`.

## 3. Data security & server/client boundary

Reference: `01-app/02-guides/data-security.md`, `server-actions.md`,
`01-app/01-getting-started/05-server-and-client-components.md`.

- [ ] **P1 — Guard server modules with `server-only`.** The `server-only` package is **not
      installed or used** (scan). Mark `src/shopify/index.ts` (holds
      `SHOPIFY_STORE_FRONT_ACCESS_TOKEN`), `src/shopify/admin-client.ts`,
      `src/lib/server/**`, and the services that touch Admin credentials, so a client import fails
      at build time. Doc: `data-security.md` (DAL / `import 'server-only'`).
- [ ] **P1 — Make generated enums type-only for client safety.** `codegen.storefront.ts` does not
      set `enumsAsTypes`, so `src/shopify/storefront/index.ts` emits runtime `export enum`
      (e.g. `OrderFinancialStatus`). Client components currently import them only via
      `import type` (verified — no runtime leaks today), but the storefront SDK still shares one
      module with the token-bearing `src/shopify/index.ts` graph. Set `enumsAsTypes: true` in the
      codegen config (or split types from the SDK) so a future non-type import cannot pull the
      SDK/token into a client bundle. Doc: `05-server-and-client-components.md`.
- [ ] **P2 — Enable React Taint.** `experimental.taint` is off; `data-security.md` recommends
      `experimental_taintUniqueValue` / `experimental_taintObjectReference` for secrets
      (`SHOPIFY_STORE_FRONT_ACCESS_TOKEN`, delegate tokens). Doc:
      `05-config/01-next-config-js/taint.md`.
- [ ] **P2 — Configure Server Actions for non-Vercel deploys.** No
      `experimental.serverActions.allowedOrigins` / `bodySizeLimit` / `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
      config. Only needed behind a custom proxy/CDN or multi-instance self-hosting. Doc:
      `server-actions.md:82-85`.
- ✅ Server actions validate inputs with Zod and re-check ownership in the DAL
  (`src/services/*`, `src/actions/*`) — matches `server-actions.md` / `forms.md`.
- ✅ `cookies()`/`headers()` are `await`ed everywhere (`src/services/cart.service.ts:72`,
  `src/lib/server/shopify-helpers.ts:19`, `src/lib/server/client-ip.ts:17`); no synchronous access.
- ✅ No metadata exported from client components; JSON-LD uses a native
  `<script type="application/ld+json">` with `<` escaped (`src/components/JsonLd.tsx`) —
  matches `02-guides/json-ld.md` (do **not** use `next/script` for JSON-LD).

## 4. Images

Reference: `01-app/01-getting-started/12-images.md`,
`03-api-reference/02-components/image.md`.

- [ ] **P1 — `priority` → `preload` (deprecated in 16).** Doc: `image.md:291` — *"Starting with
      Next.js 16, the `priority` property has been deprecated in favor of `preload`."* Migrate:
      `src/components/OptimizedImage.tsx:16,34,110`,
      `src/components/ProductCardDefault.tsx:20,32,70`,
      `src/components/ProductsList.tsx:24` (`index < 5`),
      `src/components/CollectionGrid/CollectionGrid.tsx:28` (`index < 5`),
      `src/components/PhotoGallery.tsx:211` (`selectedImageIndex === 0`),
      `src/app/page.tsx:141`, `src/app/collections/[collectionSlug]/page.tsx:182`.
- [ ] **P1 — Preload only the true above-the-fold LCP image.** `index < 5` grids and
      two home-page product grids emit ~10+ competing preloads, hurting LCP. Keep preload only on
      the hero (`src/app/page.tsx:141`) and the collection hero. (Same finding as `todo.md` #2.)
- ✅ `images.qualities: [70,75,78,80,82,85,90]` declared and every `quality={…}` in the app is in
      that list (`next.config.ts:105`).
- ✅ Uses `remotePatterns` (not the deprecated `images.domains`) for `cdn.shopify.com` /
      `res.cloudinary.com`.
- ℹ️ New 16 defaults apply without config: `minimumCacheTTL` 4h, `imageSizes` without `16`,
      `maximumRedirects` 3. Revisit only if Shopify/Cloudinary image URLs redirect more than 3×.

## 5. Fonts, CSS, metadata, routing

Reference: `13-fonts.md`, `11-css.md`, `14-metadata-and-og-images.md`, `15-route-handlers.md`,
`16-proxy.md`.

- ✅ Fonts use `next/font/google` with variable fonts and `preload` only on the body font
  (`src/app/layout.tsx:73-85`) — matches `13-fonts.md`.
- ✅ Metadata API: `metadataBase`, title template, OG/Twitter, `robots`, and a separate `viewport`
  export with `themeColor` (`src/app/layout.tsx:21-71`). `robots.ts` + `sitemap.ts` exist.
- ✅ `proxy.ts` uses the 16 convention: file at `src/proxy.ts`, named `proxy` export,
  `NextResponse`/`config.matcher` (`src/proxy.ts:16,78,80`). No `middleware.ts` remains.
- ✅ `data-scroll-behavior="smooth"` is set on `<html>` (`src/app/layout.tsx:98`) so Next keeps
  overriding smooth scroll during navigation (new 16 requirement).
- ✅ `params`/`searchParams` are Promises and `await`ed in every page (e.g.
  `src/app/collections/[collectionSlug]/page.tsx:48,93`, `src/app/search/page.tsx:44`).
- [ ] **P2 — Enable `typedRoutes`.** Stable and no longer under `experimental`. Gives type-checked
      `href`s and pairs with the existing `next typegen` script. Doc:
      `05-config/01-next-config-js/typedRoutes.md`.
- [ ] **P2 — `[collectionSlug]` reads `searchParams` at the page level → dynamic.** The build
      reports `ƒ /collections/[collectionSlug]` (vs `●` for products). The docs recommend pushing
      `searchParams`/runtime reads below a `<Suspense>` boundary (or into a client child) so the
      route can prerender a static shell. Doc: `06-fetching-data.md`, `08-caching.md`,
      `02-guides/instant-navigation.md`. (`todo.md` claims this was made SSG; the current tree and
      build show otherwise — reconcile.)
- [ ] **P2 — Consider `<Form action="/search">` for the search bar.** `next/form` gives GET
      navigation + prefetch without a server action. `src/components/SearchForm.tsx:35` currently
      wires `useActionState` manually. Doc: `02-components/form.md`. (Auth forms already use
      `next/form` ✅.)

## 6. Client/server boundary, forms, production readiness

Reference: `05-server-and-client-components.md`, `07-mutating-data.md`, `forms.md`,
`lazy-loading.md`, `production-checklist.md`, `09-revalidating.md`.

- [ ] **P1 — `EmptyState` is a client component that hides server-rendered content until hydration.**
      `src/components/EmptyState.tsx:1,41-47` starts at `opacity-0` and flips via
      `useEffect` + `setTimeout`, so `not-found.tsx`, `/search`, empty cart/orders/addresses/
      collections show nothing until JS runs, and ship JS for static markup. Convert to a Server
      Component with a pure CSS entrance animation. (Same as `todo.md` #3.) Doc:
      `05-server-and-client-components.md`.
- [ ] **P1 — Stop firing server actions on every page/navigation.** `src/contexts/CartContext/CartContext.tsx:50-70`
      calls `getCartAction()` on mount even with no cart cookie;
      `src/contexts/UserContext/UserContext.tsx:43-59` calls `getSessionAction()` on mount **and on
      every `pathname` change** (`:65`). This adds a POST round-trip after hydration on every route.
      Gate on a readable marker cookie and drop the per-navigation call. (Same as `todo.md` #1.)
      Doc: `production-checklist.md:46` (check `"use client"` boundaries), `07-mutating-data.md`.
- [ ] **P2 — Use `useOptimistic` for wishlist/cart toggles.** Docs recommend optimistic UI for
      mutations (`forms.md:386`); the current rollback logic also has a concurrency bug
      (`todo.md` #4).
- [ ] **P2 — Add `useReportWebVitals`.** Production checklist recommends measuring CWV in-app.
      Doc: `04-functions/use-report-web-vitals.md`, `production-checklist.md:131`.
- ✅ Server/client split is otherwise sound: `next/dynamic` used only for client leaves
      (`src/components/Search.tsx:12`, `src/components/QuickBuy.tsx:16`) with no `ssr: false` in a
      Server Component; React `cache()` used for request dedupe
      (`src/utils/users.ts:16`, `src/lib/server/shopify-helpers.ts:39`,
      `src/app/collections/[collectionSlug]/page.tsx:32`,
      `src/app/collections/products/[productSlug]/page.tsx:24`).
- ✅ `useActionState` + `useFormStatus` used across auth/contact/address forms;
      `next/form` used for auth forms.
- ✅ `instrumentation.ts` `register()` validates env once at boot; `poweredByHeader: false`,
      `reactStrictMode: true`; ESLint flat config (`eslint.config.js`) with
      `eslint-plugin-jsx-a11y`; `removeConsole` keeps only `error`/`warn` in production.
- ✅ Bundle analysis uses the new built-in `next experimental-analyze`
      (`package.json:12`); `lucide-react` is in the default `optimizePackageImports` list.
- ✅ `.env.example`/`.env.local` pattern respected; only `NEXT_PUBLIC_*` values reach the client.

## 7. Optional next-gen features (evaluate, not required)

- [ ] **P2 — React Compiler.** Stable in 16 but opt-in; install `babel-plugin-react-compiler` and
      set `reactCompiler: true` to auto-memoize. Expect slower builds. Doc:
      `05-config/01-next-config-js/reactCompiler.md`.
- [ ] **P2 — View Transitions / Partial Prefetching.** `react`'s `ViewTransition` is available in
      the bundled canary; useful for PDP/gallery morphs. Docs: `02-guides/view-transitions.md`,
      `adopting-partial-prefetching.md`, `instant-navigation.md`.

---

### Doc sources checked

- `01-app/01-getting-started/` (01–18), `01-app/02-guides/` (ai-agents, upgrading/version-16,
  production-checklist, server-actions, data-security, authentication, forms, json-ld, lazy-loading,
  view-transitions), `01-app/03-api-reference/` (directives, functions, components, file-conventions,
  route-segment-config, next-config-js).
- Overlaps with the existing `todo.md` are cross-referenced above rather than duplicated.
