# Global Project Audit — TODO

Scope: Next.js 16 + Shopify Storefront storefront (`main`). Audited with Graft
(`graft check` OK) + direct source reads. There is no "assessment flow" in this repo
(see `TODO-ASSESSMENT-FLOW.md`); the real flows are catalog → PDP → cart → external Shopify
checkout, plus auth/account/wishlist. Baseline is green: `tsc` 0 errors, ESLint 0 errors
(4 warnings), 66/66 tests pass.

### P0 — Critical

### [x] Fix predictive search (feature is silently broken)

**Why:** The search dropdown never renders. The route wraps the payload with
`createSuccessResponse` (`{ data, success }`) but the client reads `data.predictiveSearch`,
which is always `undefined` — a core discovery feature is dead.

**Where:** `src/app/api/search/predictive/route.ts:17,24,27`; `src/components/Search.tsx:32-33`.

**Change:** Make the response contract consistent — either return the GraphQL payload
unwrapped, or read `data.data?.predictiveSearch` in `Search.tsx`. Add a test asserting the
client reads what the route sends.

**Impact:** High

### [x] Fix logout so the session is actually invalidated

**Why:** Session/auth cookies are set with `domain: NEXT_PUBLIC_SITE_DOMAIN`
(`cookie-security.ts:30,57`) but deleted host-only (`cookieStore.delete(name)`), so a
`Domain=` cookie is **not** removed on logout — the token survives logout. Revocation errors
are also swallowed, so a failed `customerAccessTokenDelete` leaves the user logged in.

**Where:** `src/lib/server/shopify-helpers.ts:46-50`; `src/actions/authActions.ts:129-147`;
`src/utils/cookie-security.ts:14-38`.

**Change:** Delete cookies with the same `name/domain/path` they were set with (or stop
setting `domain`), and treat revocation failure as a hard error rather than silent success.

**Impact:** High

### [x] Fix open redirect on login

**Why:** `redirectUrl` comes from `?redirect=` and is only validated as an optional string;
`redirect()` honours absolute URLs, so `/login?redirect=https://evil.com` sends an
authenticated victim off-site (phishing).

**Where:** `src/actions/authActions.ts:53-74`; `src/app/(auth)/login/_components/LoginForm.tsx:34`.

**Change:** Only accept same-origin relative paths
(`startsWith('/') && !startsWith('//')`), else fall back to `config.routes.account`.

**Impact:** High

### P1 — High

### [x] Rate-limit and validate all public server actions

**Why:** `loginAction`/`registerAction`/`recoverPasswordAction` have no throttling (credential
stuffing, reset-email spam) even though Upstash is already wired for the contact form. Cart
actions forward client arrays straight to Shopify with no bounds (mass-call DoS), and the
predictive route only length-checks `q`.

**Where:** `src/actions/authActions.ts:61-123`; `src/actions/cartActions.ts:32-53`;
`src/app/api/search/predictive/route.ts:13-21`; reuse `contactActions.ts:46-55`.

**Change:** Apply the existing Upstash sliding-window limiter keyed by IP (+ email for auth);
validate cart inputs with zod (integer quantity 1..N, bounded array length) and bound `q`.

**Impact:** High

### [ ] Add the missing auth guard on `/account/update`

**Why:** The page renders without redirecting when `getUser()`/token is null (expired or
invalid token), unlike `/account`, `/orders`, `/addresses`. Middleware only checks cookie
presence, so this is a real gap.

**Where:** `src/app/account/update/page.tsx:22-28` (compare `src/app/account/page.tsx:62-64`).

**Change:** `if (!user) redirect(config.routes.login);` before rendering.

**Impact:** High

### [x] Make catalog pages genuinely cacheable

**Why:** Middleware sets `Set-Cookie` on every non-API HTML response, making catalog HTML
non-cacheable at the CDN; pagination calls `cookies()` (`PageInfoPagination` →
`getCurrentUrlWithoutParameters`), forcing dynamic rendering, so `export const revalidate` on
collection/search pages is a no-op. The catalog is the highest-traffic surface.

**Where:** `src/proxy.ts:56-59,78-88`; `src/components/PageInfoPagination.tsx:18-19`;
`src/shopify/helpers.ts:98-139`; `src/lib/server/url-helpers.ts`; `src/app/collections/[collectionSlug]/page.tsx:22`;
`src/app/search/page.tsx:27`.

**Change:** Stop writing `x-url`/`x-search-params` (and buyer-IP outside where needed) as
cookies; build pagination links from the passed `searchParams`/pathname instead of cookies.
Remove misleading `revalidate` exports once routes are truly static.

**Impact:** High

### [x] Re-enable Next.js image optimization

**Why:** `images.unoptimized: true` disables the optimizer globally, so `sizes`, `quality`,
and `placeholder` in `OptimizedImage` are inert and full-size Shopify images ship. `remotePatterns`
already allow `cdn.shopify.com`.

**Where:** `next.config.ts:93-105`; `src/components/OptimizedImage.tsx`.

**Change:** Remove `unoptimized` (or gate it to development), and size/quality the Shopify CDN
URLs via `next/image`.

**Impact:** Medium

### [x] Fix cart state reliability

**Why:** `requireCartId()` creates a cart with no dedupe, so concurrent first-time actions
(double-click add-to-cart, no in-flight disable) race and orphan a cart. `getCartAction`
swallows all errors and returns `null`, so a transient Shopify outage renders as an empty cart.
The cart is also fetched twice (SSR on `/cart` + `CartProvider` on mount).

**Where:** `src/services/cart.service.ts:93-99`; `src/actions/cartActions.ts:20-30`;
`src/app/cart/page.tsx:23-25`; `src/contexts/CartContext/CartContext.tsx:44-58`;
`src/components/ProductActions.tsx` / `src/hooks/useProductSelection.ts:85-91`.

**Change:** Dedupe cart creation (in-flight guard), disable the add button while pending,
surface a real error state instead of silently empty, and pass the SSR cart into the provider
as an initial value (single fetch).

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

## Biggest Wins

1. **Fix predictive search** — restores a dead core feature with a one-line contract fix.
2. **Fix logout/session invalidation** — closes a real security hole (session survives logout).
3. **Fix the login open redirect** — closes a phishing vector.
4. **Make the catalog cacheable (and re-enable image optimization)** — biggest performance win
   on the highest-traffic pages.
5. **Fix cart reliability + rate-limit auth/cart actions** — removes data races, silent failures
   and abuse paths in the primary conversion flow.

## Target State

- Storefront is correct end-to-end: search works, logout clears the session, no open redirect.
- Catalog pages are static/ISR and CDN-cacheable; Shopify images are optimized by `next/image`.
- Cart is race-free, surfaces errors, and fetches once per page load.
- All public server actions are validated and rate-limited; injected store HTML is sanitized.
- Dead files, unused deps/config and stale TODOs are gone; one canonical implementation per
  shared concern (quantity stepper, variant view, date formatting, section title).
- Config/env/docs match the code; generated SDKs contain only used operations.
- `tsc`, ESLint, Vitest and the P0/P1 regression tests all pass in CI.
- No assessment/AI/worker/queue subsystem is invented for a project that does not need one.
