# TODO — remaining fixes

Analysis of the Next.js 16 / Shopify storefront. Baseline gates after the latest pass: `type-check` ✅ · `test` 152/152 ✅ · `lint` 0 errors · `prettier` ✅ · `yarn install --frozen-lockfile` ✅.

Legend: **P0** = broken/critical · **P1** = high · **P2** = medium

## ✅ Fixed in this pass (12 of 20)

- Session/wishlist resolution failure no longer pins the UI in a skeleton (`UserContext.tsx` — flags set in `finally`).
- Valid-but-empty collection now shows an empty state; a missing collection returns a real 404 (`collections/[collectionSlug]/page.tsx`).
- Route error boundaries now report through `reportError` (`cart`, `account`, product).
- Auth rate limiting fails closed on backend outage and normalizes the login/recover email key (`rate-limit.ts`, `authActions.ts`).
- Collection fetch is de-duplicated across `generateMetadata`/page via React `cache()` (removed the extra `getCollectionSeoByHandle` round-trip).
- Removed the root-layout `alternates.canonical` that private pages inherited.
- Declared `images.qualities` in `next.config.ts` (Next 16 was coercing custom quality values).
- Fonts no longer pin 4 explicit weights each (variable fonts; only the body font preloads).
- `/search` with no query shows a neutral prompt instead of "no results" (`search/page.tsx`).
- Added a skip-to-content link + `<main id="main">`; empty cart now has an `h1` (`layout.tsx`, `CartEmptyState.tsx`).
- `robots.ts` disallows the bare `/account`; homepage title is descriptive (`data/seo.ts`).
- Removed dead code: `components/Price.tsx`, `components/ui/tabs.tsx` + `@radix-ui/react-tabs` dependency, and `getStandardCookieOptions`.

---

## P0 — Correctness & security

- [ ] **1. Address create/update/delete have no error handling and can throw out of the server action.**
  `src/services/address.service.ts:31-52,57-84,89-110` call `storefrontSdk('private')` unguarded (only `setDefaultAddress` at `:121-130` is wrapped). `src/actions/addressesActions.ts:28-72` has no `try/catch`, so a transient failure rejects the action instead of returning a `FormState`. Wrap the SDK calls and return `formError(...)`.

## P1 — Performance & UX

- [ ] **2. Collection detail is still fully dynamic per request.**
  The duplicate fetch is fixed, but `src/app/collections/[collectionSlug]/page.tsx:112` still reads `searchParams` (opts the route out of ISR/static rendering; no `generateStaticParams`). Move filter/sort/pagination into a client component (or a PPR Suspense boundary) so the base collection HTML is cacheable.

- [ ] **3. Cart/User providers fire server actions on every page and every navigation.**
  `src/contexts/CartContext/CartContext.tsx:50-70` calls `getCartAction()` on mount even with no cart cookie; `src/contexts/UserContext/UserContext.tsx:43-59` calls `getSessionAction()` on mount and again on every `pathname` change. Adds a POST serverless round-trip after hydration on every route/navigation. Gate on a readable marker cookie and avoid the per-navigation action.

- [ ] **4. Images are over-prioritized, hurting LCP.**
  `src/components/ProductsList.tsx:24` marks `index < 5` priority; the home page renders two 8-product grids plus `CollectionGrid` (`CollectionGrid.tsx:28`) → ~10+ competing `<link rel=preload>`. Only the true above-the-fold hero should be priority/preload (`src/app/page.tsx:141`). Drop priority from grids; migrate `priority` → `preload` (Next 16 deprecation).

- [ ] **5. `EmptyState` is a client component that reveals its content only after hydration.**
  `src/components/EmptyState.tsx:1,41-47` starts at `opacity-0` and flips via `useEffect`+`setTimeout`. On server-rendered pages that use it (`not-found.tsx`, `search/page.tsx`, empty cart/orders/addresses/collections) the content is invisible until JS runs, and client JS ships for static markup. Convert to a server component with a pure CSS entrance animation.

- [ ] **6. Optimistic/concurrency bugs in wishlist and cart state.**
  `UserContext.tsx:91-115` captures `wishlistIds` from the closure and calls `setWishlistIds(previousIds)` on failure, so two rapid toggles both roll back to the same list and erase a successful change; `handleSetWishlist` also changes identity on every toggle → whole grid re-renders (`:118-127`). `CartContext.tsx:72-150` has no request sequencing, so concurrent mutations can resolve out of order and write a stale cart. Use functional updates + a request id/optimistic rollback.

## P1 — Accessibility (WCAG 2.1 AA)

- [ ] **7. Fix heading-order skips across pages.**
  PDP jumps `h1` → `h3` (option) → `h2` (Quantity) at `src/components/ProductDescriptionClient.tsx:142,218-229` / `src/components/Option.tsx:31`. Cart/collections render `h3` card titles directly under the page `h1` (`CartSummary.tsx:35`, `CartPromoCode.tsx:14`, `CollectionCard.tsx:53`, `ProductCardDefault.tsx:127`). Auth pages lose their only `h1` below `lg` (`src/app/(auth)/_components/AuthShell.tsx:27,31`). Introduce the missing `h2` section headings and demote/make headings responsive.

- [ ] **8. Fix form/widget accessibility cluster.**
  Predictive search results are neither announced nor keyboard-navigable (`src/components/SearchResults.tsx:127` has no role/`aria-live`, no arrow-key combobox handling). The `<label htmlFor="quantity">` in `QuickBuyContent.tsx:241` points at nothing in `QuantityStepper.tsx` (WCAG 1.3.1/4.1.2). The price `Slider` has no accessible name (`Filters.tsx:264-271`). Breadcrumb `<nav>` is unlabeled and lacks `aria-current` (`Breadcrumbs.tsx:75,83`). Labeled carousel regions lack an accessible name (`ProductRecommendations.tsx:22`). Fix each per its WCAG criterion.

## P2 — Quality & testing

- [ ] **9. Remove duplicated redaction logic and stop shipping `console.error`.**
  Duplicate redaction regex/mapper exists in `src/lib/logger.ts:24-55` and `src/shopify/index.ts:69-84` — export one helper and reuse. Replace remaining `console.error` in app code (`CartContext.tsx`, `UserContext.tsx`, `ProductCardActions.tsx`, `ProductActions.tsx`, `Search.tsx`, `sitemap.ts`, `CartRemove.tsx`, `DiscountCodes.tsx`, `Address.tsx`, `WishlistContent.tsx`, `lib/client/cookies.ts`) with `reportError`/`toast`, since production `removeConsole` keeps `error`.

- [ ] **10. Add tests for the security-critical, currently-0%-covered modules.**
  `coverage/lcov.info` shows `src/proxy.ts` (0/53), `src/lib/server/rate-limit.ts` (0/31), `src/lib/server/delegate-token.ts` (0/47), `src/lib/token-renewal.ts` (8/36), `src/shopify/index.ts` (0/97), and the address/auth actions & services at 0%. These back auth, session renewal, rate limiting, and authorization. Raise the low thresholds in `vitest.config.ts:36-41` (`lines/statements: 35`) as coverage grows.

---

## Lower-priority hardening

- Token renewal can race across concurrent requests (`src/proxy.ts:35-39,63-73`) — dedupe per token so a late `Set-Cookie` cannot clobber a fresh token.
- Session cookie is `Domain`-scoped and lacks `__Host-` prefix (`src/utils/cookie-security.ts:34-45,78-87`) — prefer host-only cookies for the httpOnly customer token.
- `getWishlistProductsAction` (`src/actions/wishlistActions.ts:42-56`) is unauthenticated and unthrottled, unlike its write siblings; add a read limiter.
- Cache the "Admin unavailable" state so private requests stop re-logging on every call (`src/lib/server/delegate-token.ts:20-23,49-53`).
- Free-shipping bar hardcodes USD `$`/threshold (`CartView.tsx:19,31`) instead of formatting with the cart `currencyCode`.
- README drift: states Node "20.9+ (recommended 22+)" (`README.md:33`) while `package.json`/`.nvmrc`/CI require 24, and the license section is a placeholder (`README.md:331`) despite a real `LICENSE`.
