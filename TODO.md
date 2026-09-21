# TODO — Global Project Audit

### P1 — High

### [ ] Stop fetching the wishlist and user in the root layout

**Why:** `RootLayout` calls `getUser()` and `WishlistService.getWishlist()` (two `no-store` Shopify calls)
on every render, and `Header` calls `getShopifyToken()` again; the wishlist is only needed on account and
product pages. Collection layouts also re-fetch the collection already fetched by the page. This adds
several uncached network calls to every navigation.

**Where:** `src/app/layout.tsx:40-50`, `src/components/Header.tsx`, `src/app/collections/[collectionSlug]/layout.tsx`.

**Change:** Remove wishlist (and ideally user) from the root layout and fetch where actually used, or stream
them behind `<Suspense>`; remove the duplicate collection query in the collection layout.

**Impact:** High

### [ ] Collapse the three overlapping data-access layers

**Why:** Cart/wishlist/auth logic is spread across server actions (`src/actions`), API routes
(`src/app/api`), and services (`src/services`), plus `api-client` performing server→self HTTP. The same cart
logic exists in `CartService`, `/api/cart/*`, and `CartContext`, which is where the buyer-identity bug hides.
This is the main source of unnecessary complexity and drift.

**Where:** `src/services/*`, `src/actions/*`, `src/app/api/*`, `src/utils/api-client.ts`, `src/contexts/CartContext`.

**Change:** Use server actions (or direct service calls) for mutations; keep API routes only where a real
client-side fetch is needed (e.g. predictive search). Delete `api-client`'s server-to-self pattern.

**Impact:** High

### [ ] Simplify the sitemap and stop listing private routes

**Why:** `src/app/sitemap.tsx` re-implements a GraphQL client with `graphql-tag` plus ~250 lines of
hand-rolled pagination/backoff, while `config.sitemap` duplicates a static list that includes `/cart`,
`/login`, `/account/*`, `/logout`, `/wishlist`, `/orders`, `/reset_password` — private pages that
`robots.ts` explicitly disallows.

**Where:** `src/app/sitemap.tsx`, `src/config/index.ts` (`sitemap` array).

**Change:** Use the generated `storefrontSdk` and Next's built-in fetch caching, drop the custom retry
machinery, and generate only public pages + dynamic products/collections.

**Impact:** High

### [ ] Add real environment validation and reconcile docs/config

**Why:** `validateConfig`/`validateSiteMetadata` exist but are never called, `.env.example` marks Admin as
optional while the code requires it, and the README claims Next 15.3.1 / React 19.0.0 / TS 5.3.3 while
`package.json` is Next 16 / React 19.2 / TS 5.9.

**Where:** `src/config/validation.ts`, `src/config/index.ts`, `.env.example`, `README.md`, `next.config.ts`.

**Change:** Validate required env once at startup with a Zod schema (zod is already a dependency), fail fast
with clear messages, and update the docs to match the code.

**Impact:** High

### [ ] Delete dead code, empty routes and unused config

**Why:** Dead files add noise and imply behavior that does not exist:
`src/utils/products.ts`, `src/utils/array.ts`, `src/utils/html.ts`, `src/components/CookiesConsentBanner.tsx`,
`src/components/LoginSheet.tsx`, `src/components/ui/drawer.tsx`, `src/hooks/useHideScrollbar.ts`, the unused
`logoutAction`, the empty `next-sitemap.config.js`, and empty dirs `src/app/collections/products/`. Also fix
the 3 lint errors that make `eslint` exit 1 (`Search.tsx`, `SearchForm.tsx`, `ui/carousel.tsx`) and the
`uuid()`-per-render React keys in `HamburgerMenu`/`OrderCard`.

**Where:** as listed; lint config in `eslint.config.js`.

**Change:** Delete the dead files/config/dirs, replace generated ids with stable keys, and resolve the
`react-hooks/set-state-in-effect` errors.

**Impact:** Medium

### [ ] Fix filter and sort URL state

**Why:** `Sort` builds a fresh `URLSearchParams` and only sets `sort_key`, so changing sort discards active
`filters`; on collection pages `Filters` receives a `query` without `filters`, so checkboxes never reflect
the URL; and `applyFilters` always appends a price filter even when the slider was untouched.

**Where:** `src/app/collections/_components/Sort.tsx`, `src/app/collections/_components/Filters.tsx`,
`src/app/collections/[collectionSlug]/page.tsx` (`safeSearchParameters`).

**Change:** Preserve all existing search params when changing sort, pass the full params into `Filters`, and
only emit the price filter when it was changed.

**Impact:** Medium

### [ ] Fail the build on codegen errors and make CI meaningful

**Why:** `bin/run-codegen.ts` catches errors and never sets a non-zero exit code, so `yarn build` (which runs
codegen first) silently succeeds with stale types. CI runs `yarn lint` (currently failing) and a codegen step
that lacks `NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL` and is `continue-on-error`, and there is no test step.

**Where:** `bin/run-codegen.ts`, `.github/workflows/ci.yml`.

**Change:** `process.exit(1)` on codegen failure, fix the CI env and remove `continue-on-error`, keep lint
green, and add a real test step (see below).

**Impact:** High

### [ ] Add a minimal but high-value test suite

**Why:** There are no tests or test runner at all; cart, token/cookie handling, wishlist and form-action
error mapping are untested, and the flows already contain silent bugs.

**Where:** new `vitest` setup; targets `src/services/cart.service.ts`, `src/lib/server/shopify-helpers.ts`,
`src/utils/form-actions.ts`, `src/actions/*`.

**Change:** Add Vitest with mocked Shopify SDK for unit/integration tests, plus one e2e smoke
(home → collection → product → add to cart → checkout), and wire it into CI.

**Impact:** High

### P2 — Medium

### [ ] Rework logout into a server action

**Why:** `/account/logout` POSTs `/api/logout`, then waits 2s before redirecting, and the API route calls a
server action to delete a cookie. This is slow, fragile and unnecessarily layered.

**Where:** `src/app/account/logout/page.tsx`, `src/app/account/logout/_components/LogoutClientEffect.tsx`,
`src/app/api/logout/route.ts`.

**Change:** Implement logout as a server action/form that revokes the Shopify token, clears cookies, and
redirects immediately.

**Impact:** Medium

### [ ] Add error reporting and structured logging

**Why:** Failures are only `console.error`-logged (and `removeConsole` strips most console output in
production), so production errors are effectively invisible.

**Where:** `src/app/error.tsx`, `src/app/global-error.tsx`, `src/utils/api-responses.ts` (`safeLogError`).

**Change:** Add a single error-reporting hook (e.g. Sentry or a logging drain) and structured logs with
request/operation context.

**Impact:** Medium

### [ ] Tighten production security headers

**Why:** The CSP allows `'unsafe-eval'` and `'unsafe-inline'` scripts in production, where `unsafe-eval` is
not required by Next.js.

**Where:** `next.config.ts` (`headers()`).

**Change:** Drop `'unsafe-eval'` in production and reduce inline-script reliance (nonce or hashes where
feasible).

**Impact:** Medium

## Biggest Wins

1. Fix catalog/nav routing (missing `/collections`, wrong order links, relative-URL crash) — restores the
   primary browse flow.
2. Fix cart ↔ customer association after login — makes customer pricing/checkout identity actually work.
3. Remove the per-request Admin call and make Admin optional/lazy — removes a global failure mode and a
   blocking round trip on every request.
4. Lock down cookie server actions and harden the contact action — closes two real abuse vectors.
5. Collapse the actions/services/API/self-HTTP layers into one boring path — removes the complexity that
   produced the cart bug and speeds up future work.

## Target State

- Every advertised route resolves; all internal links use the canonical product/collection URLs.
- Header, mobile menu and search navigation work with real Shopify menus.
- Storefront-only deployments boot with just the two required Shopify env vars; Admin features degrade
  gracefully when unconfigured.
- Login/register reliably attach the cart to the customer without an internal HTTP hop.
- One obvious place for each mutation (server actions/services); API routes only for genuine client fetches.
- Pages render with only the Shopify data they need; the root layout does no per-request wishlist/user work.
- Sitemap/robots list only public, indexable URLs; private routes are excluded.
- `yarn lint`, `yarn lint-ts` and the test suite are green in CI, and codegen failures fail the build.
- Images are optimized; dead code, empty routes and unused config are gone.
- Errors are observable in production via a real reporting/logging path.
