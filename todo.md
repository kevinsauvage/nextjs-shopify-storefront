# TODO — remaining fixes

## P1 — Performance & UX

- [ ] **2. Images are over-prioritized, hurting LCP.**
      `src/components/ProductsList.tsx:24` marks `index < 5` priority; the home page renders two 8-product grids plus `CollectionGrid` (`CollectionGrid.tsx:28`) → ~10+ competing `<link rel=preload>`. Only the true above-the-fold hero should be priority/preload (`src/app/page.tsx:141`). Drop priority from grids; migrate `priority` → `preload` (Next 16 deprecation).

- [ ] **3. `EmptyState` is a client component that reveals its content only after hydration.**
      `src/components/EmptyState.tsx:1,41-47` starts at `opacity-0` and flips via `useEffect`+`setTimeout`. On server-rendered pages that use it (`not-found.tsx`, `search/page.tsx`, empty cart/orders/addresses/collections) the content is invisible until JS runs, and client JS ships for static markup. Convert to a server component with a pure CSS entrance animation.

- [ ] **4. Optimistic/concurrency bugs in wishlist and cart state.**
      `UserContext.tsx:91-115` captures `wishlistIds` from the closure and calls `setWishlistIds(previousIds)` on failure, so two rapid toggles both roll back to the same list and erase a successful change; `handleSetWishlist` also changes identity on every toggle → whole grid re-renders (`:118-127`). `CartContext.tsx:72-150` has no request sequencing, so concurrent mutations can resolve out of order and write a stale cart. Use functional updates + a request id/optimistic rollback.

## P1 — Accessibility (WCAG 2.1 AA)

- [ ] **5. Fix heading-order skips across pages.**
      PDP jumps `h1` → `h3` (option) → `h2` (Quantity) at `src/components/ProductDescriptionClient.tsx:142,218-229` / `src/components/Option.tsx:31`. Cart/collections render `h3` card titles directly under the page `h1` (`CartSummary.tsx:35`, `CartPromoCode.tsx:14`, `CollectionCard.tsx:53`, `ProductCardDefault.tsx:127`). Auth pages lose their only `h1` below `lg` (`src/app/(auth)/_components/AuthShell.tsx:27,31`). Introduce the missing `h2` section headings and demote/make headings responsive.

- [ ] **6. Fix form/widget accessibility cluster.**
      Predictive search results are neither announced nor keyboard-navigable (`src/components/SearchResults.tsx:127` has no role/`aria-live`, no arrow-key combobox handling). The `<label htmlFor="quantity">` in `QuickBuyContent.tsx:241` points at nothing in `QuantityStepper.tsx` (WCAG 1.3.1/4.1.2). The price `Slider` has no accessible name (`Filters.tsx:264-271`). Breadcrumb `<nav>` is unlabeled and lacks `aria-current` (`Breadcrumbs.tsx:75,83`). Labeled carousel regions lack an accessible name (`ProductRecommendations.tsx:22`). Fix each per its WCAG criterion.

## P2 — Quality & testing

- [ ] **7. Remove duplicated redaction logic and stop shipping `console.error`.**
      Duplicate redaction regex/mapper exists in `src/lib/logger.ts:24-55` and `src/shopify/index.ts:69-84` — export one helper and reuse. Replace remaining `console.error` in app code (`CartContext.tsx`, `UserContext.tsx`, `ProductCardActions.tsx`, `ProductActions.tsx`, `Search.tsx`, `sitemap.ts`, `CartRemove.tsx`, `DiscountCodes.tsx`, `Address.tsx`, `WishlistContent.tsx`, `lib/client/cookies.ts`) with `reportError`/`toast`, since production `removeConsole` keeps `error`.

- [ ] **8. Add tests for the security-critical, currently-0%-covered modules.**
      `coverage/lcov.info` shows `src/proxy.ts` (0/53), `src/lib/server/rate-limit.ts` (0/31), `src/lib/server/delegate-token.ts` (0/47), `src/lib/token-renewal.ts` (8/36), `src/shopify/index.ts` (0/97), and the auth actions & services at 0%. These back auth, session renewal, rate limiting, and authorization. Raise the low thresholds in `vitest.config.ts:36-41` (`lines/statements: 35`) as coverage grows.

---
