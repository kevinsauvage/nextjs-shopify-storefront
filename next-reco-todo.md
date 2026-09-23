# next-reco-todo.md

## 0. Upgrade hygiene (do first)

- [x] **P0 — DONE: Silence the Turbopack root warning.** `next.config.ts` now pins
      `turbopack: { root: import.meta.dirname }`. Verified: `next dev` and `next build` on 16.3.6
      no longer print the *"ignored pnpm-lock.yaml … set `turbopack.root`"* warning.
      Doc: `01-app/03-api-reference/05-config/01-next-config-js/turbopack.md` → _Root directory_.

- [x] **P0 — DONE: Drop the now-redundant Turbopack flags.** `package.json` scripts are now
      `"dev": "next dev"` and `"build": "yarn codegen && next build"` (Turbopack is the 16 default).
      Doc: `01-app/02-guides/upgrading/version-16.md` → _Turbopack by default_.

---

## 1. Caching & revalidation

Reference: `01-app/01-getting-started/08-caching.md`, `09-revalidating.md`,
`01-app/03-api-reference/01-directives/use-cache*.md`, `04-functions/cacheTag.md`,
`cacheLife.md`, `updateTag.md`, `revalidateTag.md`, `refresh.md`, `after.md`.

Current state: the app caches **only** through `fetch(..., { next: { revalidate } })` and segment
`export const revalidate`. There is **no** `use cache`, `cacheTag`, `cacheLife`, `revalidateTag`,
`updateTag`, or `refresh` usage anywhere (verified by scan). That is the "previous model"; the docs
now center on **Cache Components**.

- [ ] **P1 — DEFERRED (migration): Adopt Cache Components (`cacheComponents: true`).** Doc:
      `01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md`. This is a migration,
      not a flag flip: it enables PPR/static shells and **removes** the `dynamic`, `dynamicParams`,
      `revalidate`, and `fetchCache` segment configs. Existing code that relies on those
      (`src/app/page.tsx:20`, `src/app/collections/page.tsx:12`,
      `src/app/collections/products/[productSlug]/page.tsx:15`, `src/app/sitemap.ts:7,9`, and the
      `force-dynamic` account routes) must be re-expressed with `use cache` + `<Suspense>`.
      Consider the `next-cache-components-adoption` skill from `01-app/02-guides/ai-agents.md`.

- [ ] **P1 — DEFERRED (needs Cache Components): Use `updateTag` for read-your-own-writes mutations.** Cart/wishlist/address actions
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

- [ ] **P2 — Add `app/global-not-found.tsx`.** `not-found.tsx` exists at the root, but the
      production checklist calls for a global fallback for URLs matching no route at all.
      (Experimental; bypasses the layout, so re-import global styles/theme.) Doc:
      `03-file-conventions/not-found.md` → _`global-not-found.js`_,
      `production-checklist.md:87`.
- [ ] **P2 — Consider `catchError` for component-level recovery.** Doc:
      `04-functions/catchError.md`. ✅ Current `global-error.tsx` correctly renders its own
      `<html>`/`<body>`.

## 3. Data security & server/client boundary

Reference: `01-app/02-guides/data-security.md`, `server-actions.md`,
`01-app/01-getting-started/05-server-and-client-components.md`.

- [ ] **P1 — DEFERRED: Make generated enums type-only for client safety.** `codegen.storefront.ts` does not
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

## 5. Fonts, CSS, metadata, routing

Reference: `13-fonts.md`, `11-css.md`, `14-metadata-and-og-images.md`, `15-route-handlers.md`,
`16-proxy.md`.

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

- [ ] **P2 — Use `useOptimistic` for wishlist/cart toggles.** Docs recommend optimistic UI for
      mutations (`forms.md:386`); the current rollback logic also has a concurrency bug
      (`todo.md` #4).
- [ ] **P2 — Add `useReportWebVitals`.** Production checklist recommends measuring CWV in-app.
      Doc: `04-functions/use-report-web-vitals.md`, `production-checklist.md:131`.

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
