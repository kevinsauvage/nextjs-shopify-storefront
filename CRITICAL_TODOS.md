# Critical TODOs

Analysis of `nextjs-shopify-ecommerce` (Next.js 16 / Shopify Storefront).
Ordered most critical → least. Each item has a file reference and a one-line fix.

> Baseline: `yarn lint-ts` passes, 340 tests pass (42 files). Coverage:
> statements/lines `75.5%`, branches `86.7%`, functions `89.7%`. Items below
> are issues the passing suite does not catch.

---

## Medium

1. **`process.env` read outside the config layer** — `src/components/GtmScript.tsx:13`, `src/actions/contactActions.ts:70`
   Violates the AGENTS "never `process.env` directly in components" rule. Caution: `GtmScript` is a client component — routing `NEXT_PUBLIC_*` reads through a shared module that also touches server secrets risks bundling secrets client-side. Split client-safe vs server-only accessors.
   _Fix: expose via `src/config/env.ts` with a client-safe split._

2. **Heading nested inside a button; decorative icons not hidden** — `src/app/account/_components/OrderCard.tsx:130,138,161,167`
   An `<h3>` inside the collapse `<button>` is invalid HTML; `Package`/`ChevronDown` aren't `aria-hidden`. Caution: moving the heading out shrinks the click target to just the chevron — a UX tradeoff to decide deliberately.
   _Fix: restructure the trigger (heading outside, chevron button) and hide decorative icons._

3. **Heading order skipped on listings** — `src/components/ProductCardDefault.tsx:129`
   Product titles are `<h3>` directly under the page `<h1>` (no `<h2>`).
   _Fix: add an `h2` (even `sr-only`) to listing headers (collections, search, home sections)._

4. **Over-broad log redaction** — `src/lib/logger.ts:24`
   The `[a-zA-Z0-9]{32,}` rule mangles legitimate long identifiers/messages. Caution: security-sensitive regex — tighten with tests, don't just delete.
   _Fix: anchor redaction to `key=value`/token shapes with test coverage._

---

## Fixed (removed from the list)

- Stored XSS via CMS menu URLs (`url.ts`) — protocol allowlist + tests.
- Untested security modules (`token-renewal`, `account`, `authActions`) — now 100%.
- `images.unoptimized: true` removed; blur-placeholder exception kept.
- Unthrottled wishlist reads — fail-open `wishlist:read` bucket (60/min) + tests.
- Unguarded consent-cookie `JSON.parse` — try/catch + banner fallback.
- Wishlist skeleton deadlock — `productsLoaded` in `.finally`.
- Unencoded `syclid` in reset URL — built with the URL API.
- Multi-filter URL corruption — entry-by-entry param rebuild.
- Breadcrumb `aria-label` + `aria-current`; price-slider thumb labels (primitive defaults); QuickBuy dangling label → text; search results `role="status"` live region.
- Empty search no longer burns a Storefront request (banner extracted, early return).
- All raw `console.error` routed through `reportError`.
- Blank addresses page → error `EmptyState`; checkbox controlled-only; cart link labelled "Cart"; `noopener` on social links.
- Duplicate sort-key helper removed; silent form-level validation now surfaces a message (+ test); `first ?? 10` (+ test).
- Proxy `/accounting` false match (+ test); `aria-hidden` on decorative icons; inert form `title` removed; hamburger active-path prefix match; dead register `name` key removed; unused register `redirectUrl` field removed; no-JS logout fallback (`<noscript>` submit); README Node/prereqs corrected.
- Note: PhotoGallery thumbnails and QuickBuy image keys/`type="button"`/labels were already correct; only QuickBuy dots gained `type="button"` and thumbs switched `aria-current` → `aria-pressed`.
- Wishlist pending signal — confirmed the `useOptimistic` layer was already correct; added `pendingWishlistIds` to context (set before the transition, cleared at true completion), a deferred promise making `await handleSetWishlist` truthful, and `ProductCardActions` now derives loading from context instead of theater state.
- Address delete/set-default converted to `useActionState` form actions (AddressForm pattern): `NEXT_REDIRECT` handled natively by Next.js, failures toast via `useFormToast`, pending states disable the menu items.
- Coverage push: 10 new test files (`consents`, `debounce`, `images`, `utils/users`, `collection`, `user.service`, `metadata`, `structured-data`, `instrumentation`, `admin-client`) + extensions (`addressesActions`, `auth.service`, `contactActions`, `cartActions`, `wishlistActions`, `shopify-helpers`, `logger`) — 274 → 340 tests, statements 60% → 75.5%.
- Deleted 27 stale `snyk-fix-*` / `dependabot/*` remote branches (`main`/`master`/`add-pa11y-ci` kept; dependabot re-creates PRs for still-applicable updates).
