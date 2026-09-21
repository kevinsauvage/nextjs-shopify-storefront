# Global Project Audit — Prioritized TODO

Audited the actual codebase (212 source files) with Graft wiring + end-to-end flow tracing
(catalog → product → cart → checkout, auth → account, search, wishlist). The app is
functionally rich but was built AI-first, so several core flows have real correctness bugs,
the whole app is forced dynamic, and there is notable duplicate/dead code.

Prioritized: correctness → missing core → security/data → reliability → architecture →
complexity → performance → tests/docs.

## P1 — High

### [ ] Make the catalog statically renderable (decouple request context from public reads)

**Why:** The root layout reads cookies three ways — `hasShopifySession()`, `handleInitialCart()`, and every `storefrontSdk()` call (its wrapper always awaits `buildExtraHeaders()` → `cookies()` + delegate token). Because the layout touches cookies, **the entire app is server-rendered per request**; the `revalidate` exports on home/product/collection never produce ISR. This hurts TTFB/caching and masks a latent `useSearchParams`-without-`Suspense` build error on `/login`.

**Where:** `src/app/layout.tsx`, `src/shopify/index.ts` (`defaultWrapper`), `src/shopify/helpers.ts` (`buildExtraHeaders`).

**Change:** Only attach buyer/delegate headers for genuinely private operations (a separate `storefrontSdk('private')`), keep public catalog reads context-free, and move cart/session-dependent UI into client components hydrated from server actions/route handlers. Then wrap `useSearchParams` consumers in `<Suspense>` and verify home/product/collection are ISR/static.

**Impact:** High

### [ ] Make the cart reliable: never silently replace it, create it server-side

**Why:** `CartService.getCart` swallows every error and returns `null`; the layout then treats it as "no cart" and a new cart is created, **orphaning the existing cart and losing items** on any transient Shopify error. `CartProvider` also eagerly creates a cart client-side for every visitor (with a `cartMock` fallback), so a first-visit user can click Add-to-Cart before creation finishes and get "Cart not found".

**Where:** `src/services/cart.service.ts` (`getCart`, `getOrCreateCart`), `src/contexts/CartContext/CartContext.tsx`, `src/app/layout.tsx`, `src/mocks/cart.ts`.

**Change:** Distinguish "cart missing/invalid" (create) from "request failed" (surface/retry, keep existing cookie). Create the cart once server-side and pass it as `initialCart`; drop the mock-cart initial state and the client-side create effect.

**Impact:** High

### [ ] Collapse duplicate product list + product detail implementations

**Why:** `ProductsEdgeList` and `ProductsList` are the same component with different input shapes; `QuickBuyContent` and `ProductDescriptionClient` independently reimplement variant selection, add-to-cart, wishlist, badges and quantity UI — and have already diverged (the null-quantity bug exists in one path but not the other). Every product UX change must be made twice.

**Where:** `src/components/ProductsEdgeList.tsx`, `src/components/ProductsList.tsx`, `src/components/QuickBuyContent.tsx`, `src/components/ProductDescriptionClient.tsx`, `src/hooks/useProductSelection.ts`.

**Change:** Keep one list component (accept `ProductFieldsFragment[]`, derive from edges at the call site). Extract one shared product purchase block (options + quantity + add-to-cart + wishlist) consumed by both the PDP and the quick-view sheet.

**Impact:** Medium

### [ ] Rework the wishlist: fewer round-trips, single write, no hard Admin dependency

**Why:** Each add/remove makes 4–5 sequential Shopify calls (`requireAuth` → `getUser` network call → `getWishlistIds` → `addProduct` → `getWishlistIds` again → `getWishlist`), stores state as one JSON metafield with read-modify-write (lost updates under concurrency), and hard-requires the optional Admin API. It also `router.refresh()`es the whole page on every toggle.

**Where:** `src/services/wishlist.service.ts`, `src/actions/wishlistActions.ts`, `src/contexts/UserContext/UserContext.tsx`.

**Change:** Read IDs once, compute the new set, write once; take the customer id from the session instead of a `getUser` fetch; use optimistic client state instead of `router.refresh()`; and either use Storefront customer metafields or document the Admin requirement explicitly. Consider localStorage for anonymous users.

**Impact:** Medium

### [ ] Simplify product variant selection

**Why:** `useProductSelection` schedules three `setTimeout(..., 0)` calls inside one effect to dodge hydration issues and calls `selectVariantByOptions` from inside a state updater (a side effect in an updater, double-invoked under StrictMode). Option availability is computed with inverted naming. This is the most bug-prone logic in the app.

**Where:** `src/hooks/useProductSelection.ts`.

**Change:** Derive selected variant/options from props + a single state value with `useMemo`; remove timers and side effects from updaters; rename the availability helper to match its return value.

**Impact:** Medium

### [ ] Remove dead code and eliminate duplicated account fetching

**Why:** Confirmed-unused exports (`CartService.getOrCreateCart`, `getCartById`; `getShopifyCartId`; `WishlistService.getErrorStatus`; `getOptimizedImageUrl`/`generateImageSrcSet`/`getImageSizeForViewport`; `analytics` default). `account/page.tsx` fetches customer orders twice (`first: 1` then `first: 3`), and the same stats/orders are re-fetched on `/account/update` and in `UserContext` (wishlist fetched again client-side).

**Where:** `src/services/cart.service.ts`, `src/services/wishlist.service.ts`, `src/lib/server/shopify-helpers.ts`, `src/utils/images.ts`, `src/lib/client/analytics.ts`, `src/app/account/page.tsx`, `src/app/account/update/page.tsx`.

**Change:** Delete dead code; fetch recent orders once (`first: 3`) and derive the count; share a single stats loader; stop double-loading the wishlist.

**Impact:** Medium

### [ ] Memoize per-request user/token lookups

**Why:** `getUser()` and `getShopifyToken()` are called repeatedly within a single request (account layout, page, and each service), each triggering Shopify network calls. `/account` alone resolves the customer several times.

**Where:** `src/utils/users.ts`, `src/lib/server/shopify-helpers.ts`, account pages/services.

**Change:** Wrap `getUser`/`getShopifyToken` in React `cache()` for per-request memoization; have services accept an already-resolved user where practical.

**Impact:** Medium

---

## P2 — Medium

### [ ] Harden CSP and buyer-IP handling

**Why:** `script-src` includes `'unsafe-inline'`, which negates most XSS protection, and `proxy.ts` trusts the spoofable `x-forwarded-for` header as the Shopify buyer IP (affects markets/pricing).

**Where:** `next.config.ts`, `src/proxy.ts`, `src/shopify/helpers.ts`.

**Change:** Move to a nonce/hash-based `script-src` via `proxy` + `next/script` nonce (or explicitly document the accepted risk). Derive buyer IP from the platform-trusted header only, and document the trust boundary.

**Impact:** Medium

### [ ] Replace the in-memory contact-form rate limiter

**Why:** The limiter is a per-instance `Map`, so on serverless it resets constantly and provides almost no protection; it also silently clears at 10k entries.

**Where:** `src/actions/contactActions.ts`.

**Change:** Use a durable store (Vercel KV/Upstash) or an email API with built-in abuse controls; keep the honeypot.

**Impact:** Medium

### [ ] Add tests for the money paths

**Why:** The 8 test files cover only pure utils (40 tests). Cart mutations, auth actions, wishlist and pagination/filter parsing are untested, so regressions like the null-quantity bug go unnoticed.

**Where:** `src/services/**`, `src/actions/**`, `src/shopify/helpers.ts`, `vitest.config.ts`.

**Change:** Unit-test cart/auth/wishlist services and actions with mocked `storefrontSdk`/`cookies`, plus edge cases for `parseFiltersQuery`, `adjustPaginationVariables` and price formatting.

**Impact:** Medium

### [ ] Simplify the bespoke form-state layer

**Why:** Form actions return Zod field errors twice (spread at top level _and_ nested in `fieldErrors`) plus `customerUserErrors`/`userErrors`, consumed by a custom `useFormStatesEffect` hook. It is consistent but heavier than needed and makes every action signature noisy.

**Where:** `src/types/formActions.ts`, `src/utils/form-actions.ts`, `src/hooks/useFormStatesEffect.ts`, `src/actions/*`.

**Change:** Standardize on a single `{ ok: boolean; errors?: Record<string, string[]>; message?: string }` result and one small hook; delete the redundant spreading and helper layer.

**Impact:** Low

---

## Biggest Wins

1. **Fix the null-`quantityAvailable` buy path** — restores checkout for untracked-inventory products (a core, currently broken flow).
2. **Decouple public reads from cookies and restore ISR/static rendering** — the single largest performance and architecture improvement.
3. **Make the cart reliable** — no more silently orphaned carts / lost items / first-visit race.
4. **Fix render-time cookie writes on token renewal** — removes an intermittent account-page crash.
5. **Collapse the duplicated product UI + rework the wishlist** — removes the biggest source of divergent bugs and the highest per-action network cost.

## Target State

- Catalog pages (home, collections, products) are statically rendered / ISR and fast, with cart and session data hydrated client-side.
- Every product can be added to the cart regardless of inventory tracking, and quantity controls behave consistently on the PDP, quick view and cart.
- Cart state is created server-side, preserved across transient errors, and never silently replaced.
- Account pages never crash on token renewal; per-request user/customer lookups are memoized.
- One product-card list and one shared purchase UI serve the catalog, PDP and quick view.
- Wishlist updates in one Shopify call with optimistic UI and no hard Admin dependency.
- User-supplied query params can never crash a page.
- Security posture: nonce-based CSP and trusted-header-only buyer IP.
- Core flows (cart, auth, wishlist, filter parsing) are covered by tests, and dead code is gone.
