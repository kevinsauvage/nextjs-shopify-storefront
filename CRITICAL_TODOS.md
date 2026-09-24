# Critical TODOs

Analysis of `nextjs-shopify-ecommerce` (Next.js 16 / Shopify Storefront).
Ordered most critical → least. Each item has a file reference and a one-line fix.

> Baseline: `yarn lint-ts` passes, 274 tests pass. Items below are issues the
> passing suite does not catch.

---

## High

1. **Wishlist toggle has no real 'pending' signal** — `src/contexts/UserContext/UserContext.tsx:129`
   `startTransition(async …)` returns immediately, so `ProductCardActions.tsx:31-39` clears loading before the write lands and the awaited result is meaningless.
   _Fix: drive loading from optimistic state or return/await the async body._

2. **`redirect()` inside an imperatively-called address action is caught and logged as an error** — `src/app/account/addresses/_components/Address.tsx:42,57,133,146`
   `deleteAddressAction`/`setDefaultAddressAction` `redirect()` on success; the resulting `NEXT_REDIRECT` is swallowed by `.catch(...)`.
   _Fix: use `useActionState` / form actions instead of imperative calls._

3. **Coverage thresholds far below the configured floor** — `vitest.config.ts` vs actual
   Actual: statements/lines `~60%`, branches `~84%`, functions `~81%`; contexts/hooks diverge widely (`CartContext` 0%, `UserContext` 0%).
   _Fix: raise measured coverage on `actions/`, `lib/`, `services/` rather than only skeleton files._

---

## Medium

4. **`process.env` read outside the config layer** — `src/components/GtmScript.tsx:13`, `src/actions/contactActions.ts:70`
   Violates the AGENTS "never `process.env` directly in components" rule. Caution: `GtmScript` is a client component — routing `NEXT_PUBLIC_*` reads through a shared module that also touches server secrets risks bundling secrets client-side. Split client-safe vs server-only accessors.
   _Fix: expose via `src/config/env.ts` with a client-safe split._

5. **Heading nested inside a button; decorative icons not hidden** — `src/app/account/_components/OrderCard.tsx:130,138,161,167`
   An `<h3>` inside the collapse `<button>` is invalid HTML; `Package`/`ChevronDown` aren't `aria-hidden`. Caution: moving the heading out shrinks the click target to just the chevron — a UX tradeoff to decide deliberately.
   _Fix: restructure the trigger (heading outside, chevron button) and hide decorative icons._

6. **Heading order skipped on listings** — `src/components/ProductCardDefault.tsx:129`
   Product titles are `<h3>` directly under the page `<h1>` (no `<h2>`).
   _Fix: add an `h2` (even `sr-only`) to listing headers (collections, search, home sections)._

7. **Over-broad log redaction** — `src/lib/logger.ts:24`
   The `[a-zA-Z0-9]{32,}` rule mangles legitimate long identifiers/messages. Caution: security-sensitive regex — tighten with tests, don't just delete.
   _Fix: anchor redaction to `key=value`/token shapes with test coverage._

---

## Low

8. **~27 stale `snyk-fix-*` / `dependabot/*` branches on `origin`** — remote only
   _Fix: merge or delete after triage to reduce noise and stale-dependency security surface._

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
