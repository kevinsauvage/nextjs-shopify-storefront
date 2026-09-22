# Project Audit — TODO

Audit of the Next.js 16 / React 19 Shopify storefront at `Ecommerce-portfolio`.
Legend: **P0** = critical (data loss/leak, broken checkout, security, or no safety net) · **P1** = important.

> **Easy wins landed** (see "Completed in this pass" at the bottom). Remaining items are the ones
> that need design decisions, schema/query changes, or broader refactors.

---

## P1 — Important

- [x] **P1-1 · GTM never loads in the session where consent is granted**
      `GtmScript` now re-reads the consent cookie on a `localConsentUpdated`
      `window` event dispatched by `CookieBanner` after every choice
      (`src/lib/client/analytics.ts`, `src/components/GtmScript.tsx`,
      `src/components/CookieBanner.tsx`), so `<Script id="gtm">` mounts in the
      same session instead of waiting for a reload.

- [x] **P1-2 · Predictive search has races and shows stale results**
      `src/components/Search.tsx` now aborts the in-flight request and tags each
      one with a request id, ignoring responses that are no longer the latest;
      clearing the input to `< 2` chars aborts and resets so an in-flight
      response can no longer reappear.

- [x] **P1-3 · Wishlist writes are unhardened and non-atomic**
      `src/actions/wishlistActions.ts` validates ids against a product-GID
      pattern (`isValidWishlistProductId`, 255-char cap), rate limits writes per
      client IP, caps the input list, and returns generic messages.
      `WishlistService.mutateWishlist` re-reads inside a per-customer lock so
      concurrent read-modify-write cycles serialize instead of losing updates,
      and `resolveProductsByIds` validates + caps ids before hitting the
      Storefront API.

- [x] **P1-4 · Accessibility regressions in interactive elements**
      `Button asChild` now wraps the link/`span` in `SearchResults`,
      `PageInfoPagination`, and `CartEmptyState` (disabled pagination renders a
      real disabled button, no `href=""`); invalid `role="option"` and the
      malformed `aria-describedby` were removed/fixed
      (`SearchResults.tsx`, `AccountNavigationSheet.tsx`); and `PhotoGallery`
      scopes arrow-key handling to the gallery/lightbox and never hijacks keys
      from inputs.

---

## Additional backlog (lower priority)

- [ ] Add `noindex` metadata to cart/search/auth routes (robots disallows are in place but do not prevent indexing of linked URLs).
- [ ] Pin Node (`engines` + `.nvmrc`) and align `@types/node`, CI, and Codacy (currently 16 vs 22 vs 25).
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
