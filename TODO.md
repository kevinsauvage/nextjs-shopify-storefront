# TODO — Global Project Audit

Audit of the actual codebase (Next.js 16 App Router + Shopify Storefront/Admin GraphQL).
Note: the brief mentioned an "assessment flow"; this project has no assessment feature. The
flows audited are browse → collection → product → cart → checkout, auth, account, wishlist.

Priorities: P0 = broken/unsafe, P1 = high impact, P2 = worthwhile later.

### P0 — Critical

### [ ] Fix catalog routing so "Browse Collections" and order links resolve

**Why:** `/collections` is linked from the search, cart, orders and wishlist empty states, from
`config.routes.collection`, the sitemap and robots, but there is no `src/app/collections/page.tsx`,
so the primary "browse all" entry point 404s. Order history also links
`/collections/{collection}/products/{handle}`, which does not match the real route
`/collections/products/[productSlug]`, so "buy again" links 404.

**Where:** `src/app/collections/` (missing `page.tsx`), `src/app/account/_components/OrderCard.tsx:168`,
`src/config/index.ts` (`routes.collection`), `src/app/sitemap.tsx`.

**Change:** Add a `/collections` index page that lists all collections, and make product links use the
one real product route (ideally promote it to `/products/[handle]` and update every link).

**Impact:** High

### [ ] Fix primary navigation crash on relative Shopify menu URLs

**Why:** `HamburgerMenu` and `CollectionNav` build links with `new URL(item.url)`. Shopify menu URLs are
relative (e.g. `/collections/sale`), and `new URL('/collections/sale')` throws `TypeError: Invalid URL`,
breaking the header/mobile navigation for any store menu.

**Where:** `src/components/HamburgerMenu.tsx` (`renderMenuItem`), `src/app/collections/_components/CollectionNav.tsx`.

**Change:** Use `item.url` directly with Next `<Link>`/`router.push`; parse query strings defensively
without `new URL`.

**Impact:** High

### [ ] Make the Shopify Admin API optional and remove the per-request Admin call

**Why:** `src/shopify/index.ts` throws at module load if `SHOPIFY_ADMIN_URL`/`SHOPIFY_STORE_FRONT_ADMIN_TOKEN`
are missing, so the app cannot start without Admin credentials even though `.env.example`/README call them
optional. On top of that, `src/proxy.ts` awaits `setDelegateTokenAction()` on every matched request, which
calls Shopify Admin `delegateAccessTokenCreate` and throws if `SHOPIFY_SCOPE` is unset — a page-500 and a
blocking Admin round trip for all traffic.

**Where:** `src/shopify/index.ts:20-40`, `src/proxy.ts:22`, `src/actions/delegateTokenActions.ts`, `src/shopify/helpers.ts`.

**Change:** Create the Admin client lazily and only where Admin features are used; fail soft when Admin is
unconfigured. Generate/cache the delegate token outside the request path (lazy on demand or server cache),
never on every request.

**Impact:** High

### [ ] Fix cart ↔ customer association after login/register

**Why:** `AuthService.updateCartBuyerIdentity` calls its own `/api/cart/buyer-identity` over HTTP from the
server. Server-to-server `fetch` does not forward the browser cookies, so the route reads no `x-cart-id` and
returns "Cart not found"; the failure is retried 3× and swallowed. The cart is never attached to the customer
after login, and the endpoint trusts a `customerAccessToken` from the request body.

**Where:** `src/services/auth.service.ts:150-230`, `src/utils/api-client.ts`, `src/app/api/cart/buyer-identity/route.ts`.

**Change:** Call `storefrontSdk().cartBuyerIdentityUpdate` directly from the service with the token obtained
server-side; delete the self-HTTP hop and the body-token contract.

**Impact:** High

### [ ] Lock down the generic cookie server actions

**Why:** `cookiesActions.ts` exports `setCookieAction(name, value, options)`, `delCookieAction(name)` and
`getCookieAction(name)` as `'use server'` actions. Any client can POST to the action endpoint and set/delete
arbitrary cookies (including `shopify-storefront-access-token` and `x-cart-id`). `logoutAction` in
`usersActions.ts` is also an unused public action.

**Where:** `src/actions/cookiesActions.ts`, `src/actions/usersActions.ts` (`logoutAction`), consumers in
`src/actions/delegateTokenActions.ts`, `src/app/api/logout/route.ts`.

**Change:** Convert these to plain internal server helpers (drop `'use server'`), or inline the cookie
operations where used; delete the dead `logoutAction`.

**Impact:** High

### [ ] Harden the contact email action

**Why:** `contactAction` is a public server action that sends mail through Gmail SMTP using
`EMAIL_ADDRESS`/`EMAIL_PASSWORD`, hardcodes the recipient, uses the visitor's email as `from` (spoofing), and
has no rate limiting or bot protection — an open relay / spam vector and a credential-exposure risk.

**Where:** `src/actions/contactActions.ts`, `src/app/(legal)/contact/_components/ContactForm.tsx`.

**Change:** Use a transactional email provider (or a plain mailto / Shopify contact), validate and rate-limit
submissions, never spoof `from`, and move secrets to proper env handling.

**Impact:** High

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
