# Project Audit — TODO

Audit of the Next.js 16 / React 19 Shopify storefront at `Ecommerce-portfolio`.
Legend: **P0** = critical (data loss/leak, broken checkout, security, or no safety net) · **P1** = important.

> **Easy wins landed** (see "Completed in this pass" at the bottom). Remaining items are the ones
> that need design decisions, schema/query changes, or broader refactors.

---

## P0 — Critical

- [x] **P0-1 · Cross-user cart contamination via shared in-flight promise**
      `src/services/cart.service.ts:33,97-109` — `createCartInFlight` is a `static` field shared across _all_ concurrent requests in the same server instance. Two visitors with no cart cookie arriving together: the second awaits the first's `createCart()` (whose `cookies().set()` is bound to the first request's context), receives the first user's cart id, and mutates it; its own response never gets a cart cookie.
      **Fix:** keep request-scoped state out of static fields — wrap the read/create in `React.cache()`, key the in-flight map by session, or create inline and accept the rare duplicate.

- [x] **P0-2 · Invalid option combinations silently add the wrong variant to the cart**
      `src/hooks/useProductSelection.ts:45-53` falls back to `variants[0]` when no variant matches the selection, and `isOptionOutOfStock` (`:71-79`) only checks whether a value exists on _some_ variant, ignoring the rest of the selection. On a "Red/S + Blue/M" product, choosing Red + M keeps M enabled, highlights it as selected, then prices and adds **Red/S**.
      **Fix:** return `undefined` (show "unavailable", disable Add to Cart) when no exact match exists; compute availability against the full selection and `availableForSale`.

- [x] **P0-3 · Cart totals do not reconcile with Shopify's authoritative amounts**
      `src/app/cart/_components/CartSummary.tsx:15-19` derives `discount = subtotal - total + tax`, but `total` includes shipping and `totalTaxAmount` is deprecated/unpopulated, so the "Discount" is wrong whenever shipping exists and `Subtotal − Discount + Tax ≠ Total`. `src/app/cart/_components/LineItem.tsx:18-22` computes line totals from `merchandise.price` (today's price) instead of the cart line's `cost`, so line prices drift from the summary if a variant's price changed.
      **Fix:** use `cart.discountAllocations`/`discountCodes` for the discount, drop the deprecated tax row, and render `lines[].cost.totalAmount` (add it to the cart fragment, then regenerate codegen).

- [x] **P0-4 · `getUser()` mutates cookies during render → 500 on an expired/invalid session**
      `src/utils/users.ts:22-34` calls `clearShopifyToken()` (a `cookies().delete()`) from a function invoked during Server Component render (`src/app/account/page.tsx`, `.../update/page.tsx`, `.../addresses/page.tsx`). Next.js forbids cookie writes while rendering, and `src/proxy.ts` only redirects when the cookie is _absent_, not when it is stale — so an expired token produces a 500 instead of a login redirect.
      **Fix:** do not touch cookies in `getUser()`; return `null` and let callers `redirect()`, and clear stale tokens in middleware/a route handler.

- [x] **P0-5 · CI never runs `next build` and fakes the generated route types**
      `.github/workflows/ci.yml:30-47` runs lint/typecheck/stylelint/test only, then hand-writes a stub `.next/dev/types/routes.d.ts`. Server/Client boundary errors, static-generation failures, invalid route conventions, and build-time env problems are all invisible until a production deploy.
      **Fix:** add a `yarn build` job (with placeholder env) and let Next generate the real route types instead of the stub.

- [x] **P0-6 · No root metadata/`metadataBase` and no structured data**
      `src/app/layout.tsx` exports neither `metadata` nor `viewport`, so there is no `metadataBase`, title template, or default OG/Twitter/description — plain pages render bare titles. There is no JSON-LD anywhere on a commerce site (`Product`/`Offer`, `BreadcrumbList`, `Organization`), forfeiting rich results.
      **Fix:** add `metadata`/`viewport` to the root layout (title template, `metadataBase`, icons, OG/Twitter defaults) and emit JSON-LD on product, collection, and root.

---

## P1 — Important

- [ ] **P1-1 · GTM never loads in the session where consent is granted**
      `src/components/GtmScript.tsx:11-31` computes consent once inside `useEffect([])`; `CookieBanner` only calls `gtag('consent','update')` and never re-renders it, so the `<Script id="gtm">` block (`:51-64`) mounts only after a full reload — analytics are lost for the whole first session.
      **Fix:** share consent via context/state or a `window` event so `GtmScript` re-evaluates, or always mount GTM and rely on Consent Mode.

- [ ] **P1-2 · Predictive search has races and shows stale results**
      `src/components/Search.tsx:19-48` issues `fetch` calls with no `AbortController` or request sequencing, so a slower earlier query can overwrite newer results, and an in-flight response reappears after the input is cleared to `< 2` chars (`:64`).
      **Fix:** abort the previous request or tag responses with a request id and ignore stale ones.

- [ ] **P1-3 · Wishlist writes are unhardened and non-atomic**
      `src/actions/wishlistActions.ts:35-106` returns raw `error.message` to the browser, validates only `typeof productId === 'string'` (no length/GID check), has no rate limiting despite doing an Admin API write per call, and performs a read-modify-write (`:41-58,76-89`) that loses concurrent updates. `getWishlistProductsAction` (`:22-33`) is an unauthenticated, uncapped GraphQL proxy.
      **Fix:** return generic messages, validate ids, add per-session rate limits, cap input length, and serialize/atomically apply writes.

- [ ] **P1-4 · Accessibility regressions in interactive elements**
      `Button` nested inside `Link` (`src/components/SearchResults.tsx:51-98`, `src/components/PageInfoPagination.tsx:24-58`, `src/app/cart/_components/CartEmptyState.tsx:22-26`) leaves disabled controls focusable and can emit `href=""`; `role="option"` is used with no `listbox` ancestor (`SearchResults.tsx:56,93`); `aria-describedby='"Account Navigation">'` is malformed (`src/app/account/_components/AccountNavigationSheet.tsx:40`); and `PhotoGallery.tsx:65-80` hijacks `ArrowLeft/Right` globally with `preventDefault`, breaking keyboard input on product pages.
      **Fix:** use `Button asChild` + `Link` (omit the link when there is no page), fix/remove invalid ARIA, and scope gallery key handling to the gallery (no `preventDefault` for inputs).

---

## Additional backlog (lower priority)

- [ ] Add `noindex` metadata to cart/search/auth routes (robots disallows are in place but do not prevent indexing of linked URLs).
- [ ] Pin Node (`engines` + `.nvmrc`) and align `@types/node`, CI, and Codacy (currently 16 vs 22 vs 25).
- [ ] Validate codegen in CI (fixture SDL + `git diff --exit-code`) so the committed SDK cannot drift.
- [ ] Add Prettier check, coverage thresholds, and Dependabot/`audit` to CI.
- [ ] Move codegen packages and `@types/*` out of `dependencies`.
- [ ] Fix `formatDate` timezone-dependent hydration mismatches (force `timeZone` or format server-side).
- [ ] Use `next/image` for `OrderCard` line items; use plain `<a rel="noopener noreferrer">` for external checkout/tracking links.
- [ ] Make `Breadcrumbs` resilient: safe `decodeURIComponent` (a malformed `%` currently throws during render).
- [ ] Derive `Filters` price bounds from the catalog instead of a hardcoded `200`; import `SearchForm`'s label from `@/components/ui/label`.
- [ ] Reduce per-card client cost: keep `ProductCardDefault` server-renderable where possible and avoid mounting `QuickBuy` per card until interaction.

---

## Completed in this pass

- [x] **P0-1** — Removed the `static createCartInFlight` promise from `CartService`; `requireCartId()` now creates inline so no request can await another request's cart cookie (`src/services/cart.service.ts`).
- [x] **P0-2** — Exact variant match (no `variants[0]` fallback) and full-selection/`availableForSale` availability, extracted into tested pure helpers (`src/utils/productSelection.ts`, `+10` unit tests). Invalid combos render "Unavailable" and disable Add to Cart.
- [x] **P0-3** — Added `lines[].cost` to the cart fragment and regenerated codegen; line prices use `cost.totalAmount`, and the summary derives the discount from per-line `discountAllocations`, dropping the deprecated tax row.
- [x] **P0-4** — `getUser()` no longer writes cookies; stale/expired/revoked tokens are cleared in `src/proxy.ts`, which also prevents the login↔account redirect loop.
- [x] **P0-5** — CI now runs `next typegen` (real route types, no stub) plus a credential-gated `yarn build` job (`.github/workflows/ci.yml`).
- [x] **P0-6** — Root `metadata`/`viewport` (metadataBase, title template, OG/Twitter, icons) and JSON-LD for `Organization`/`WebSite` (site-wide), `Product`+`BreadcrumbList`, and `CollectionPage`+`BreadcrumbList`.

Verified: `tsc` clean · `eslint` 0 errors · `stylelint` clean · 133 tests pass · full `next build` (731 static pages).
