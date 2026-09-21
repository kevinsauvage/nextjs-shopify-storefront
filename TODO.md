# Global Project Audit — TODO

### P1 — High

### [ ] Add the missing auth guard on `/account/update`

**Why:** The page renders without redirecting when `getUser()`/token is null (expired or
invalid token), unlike `/account`, `/orders`, `/addresses`. Middleware only checks cookie
presence, so this is a real gap.

**Where:** `src/app/account/update/page.tsx:22-28` (compare `src/app/account/page.tsx:62-64`).

**Change:** `if (!user) redirect(config.routes.login);` before rendering.

**Impact:** High

### [ ] Sanitize merchant/store HTML before injection

**Why:** `descriptionHtml` and legal-policy `body` (store-controlled) are injected via
`dangerouslySetInnerHTML` under a CSP that allows `'unsafe-inline'`, so any injected markup has
no backstop.

**Where:** `src/components/ProductDescriptionClient.tsx:148-152`;
`src/app/(legal)/terms/page.tsx:28` (and shipping/privacy/refund);
`next.config.ts:21-28`.

**Change:** Sanitize with a maintained package (e.g. `isomorphic-dompurify`) before rendering,
or move to a nonce-based `script-src`.

**Impact:** Medium

### [ ] Remove dead code, unused dependencies and stale artifacts

**Why:** Verified-unused files, exports, config and deps add noise and maintenance cost for a
project that should stay small.

**Where (verified zero references):** `src/components/layout/` (`ListSpacing.tsx`,
`SpacingContainer.tsx`, `index.ts`); `src/app/account/_components/Title.tsx`; 4 of 5 functions in
`src/lib/server/url-helpers.ts`; `logWarn` (`src/lib/logger.ts:65`); `ProductSelection` type
(`src/hooks/useProductSelection.ts:105`); `LOCAL_STORAGE_KEYS`/`config.localStorageKeys`;
`config.name`; unused `revalidate.search/product`; `routes.updateAddress`, `routes.resetPassword`;
dep `tailwindcss-animate`; 9 unreferenced devDeps in `package.json`; stale `TODO-ASSESSMENT-FLOW.md`;
`components.json` alias `@/lib/utils` (does not exist).

**Change:** Delete the dead files/exports/deps and the stale TODO artifact; keep only the one
used URL helper. Re-run lint/tsc/tests after.

**Impact:** Medium

### [ ] Consolidate duplicated UI and business logic

**Why:** Near-duplicate implementations drift and slow every change.

**Where:** Two quantity steppers — `src/components/QuantityUpdater.tsx` vs
`src/components/ProductQuantitySelector.tsx`; PDP vs QuickBuy variant view —
`src/components/ProductDescriptionClient.tsx:45-88` vs `src/components/QuickBuyContent.tsx:34-57`
(both re-derive the same price/stock/options from `useProductSelection`); date formatting copied
3× (`AccountStats.tsx:67`, `RecentOrdersPreview.tsx:16`, `OrderCard.tsx:55`); local `SectionTitle`
in `src/components/SearchResults.tsx:101` duplicates `src/components/SectionTitle.tsx`.

**Change:** Unify into one quantity stepper and one shared `useProductVariantView`/panel; add a
`formatDate` to `src/utils/format.ts`; reuse the shared `SectionTitle`.

**Impact:** Medium

### P2 — Medium

### [ ] Add a 404 page and fix Suspense boundaries

**Why:** `notFound()` is called (`products/[productSlug]/page.tsx:100`) but no `not-found.tsx`
exists, so users get an unstyled default 404. `Sort.tsx:26` reads `useSearchParams` without a
`Suspense` boundary — currently masked only because those routes are dynamic.

**Where:** add `src/app/not-found.tsx`; `src/app/collections/_components/Sort.tsx:26`.

**Change:** Add a branded root `not-found.tsx` and wrap `Sort` in `<Suspense>`.

**Impact:** Medium

### [ ] Cut redundant product queries and ineffective revalidation

**Why:** The PDP does three sequential Shopify round-trips (metadata, body, recommendations)
and `revalidatePath` is called on every mutation against routes already `force-dynamic`, adding
overhead with no effect.

**Where:** `src/app/collections/products/[productSlug]/page.tsx:52-106`;
`src/services/cart.service.ts:136,221-223`; `src/services/address.service.ts`; `src/services/user.service.ts:59`.

**Change:** Run independent queries with `Promise.all`, memoize product lookups, and drop
`revalidatePath` for dynamic routes (rely on server-action refresh).

**Impact:** Medium

### [ ] Config, env and docs hygiene

**Why:** Docs and config have drifted from the code, which misleads contributors and hides real
requirements.

**Where:** `README.md` (test script/name/structure drift, env table); `src/config/env.ts` only
validates a subset of the `NEXT_PUBLIC_SITE_*` vars actually used (e.g. `NEXT_PUBLIC_SITE_NAME`);
`components.json` alias `@/lib/utils`; `jsconfig.json` duplicates `tsconfig.json`; empty `TODO.md`
was the only tracked TODO.

**Change:** Align README with `package.json` and the real tree, validate the site-metadata env
used by `config/index.ts`/`data/siteMetadata.ts`, fix or drop the dead aliases.

**Impact:** Low

### [ ] Slim the generated Shopify Admin SDK

**Why:** `src/shopify/admin/index.ts` is 63k lines, but only two Admin operations
(`delegateAccessTokenCreate`, `MetafieldsSet`) are used — it inflates type-check and bundle
analysis.

**Where:** `codegen.admin.ts`; `src/shopify/admin/index.ts`.

**Change:** Enable `onlyOperationTypes` (and near-operation-file output) in the Admin codegen
config so only used operations are emitted, rather than the full schema.

**Impact:** Low

### [ ] Add regression tests for the corrected flows

**Why:** Unit coverage is decent for utils/services but none of the P0/P1 fixes are guarded by
tests, so they can silently regress.

**Where:** `src/app/api/search/predictive/*`, `src/actions/*`, cookie/session helpers.

**Change:** Add focused tests: predictive response contract, login open-redirect rejection,
logout cookie clearing (with/without `domain`), cart input validation bounds.

**Impact:** Medium
