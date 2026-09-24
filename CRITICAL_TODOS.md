# Critical TODOs

Analysis of `nextjs-shopify-ecommerce` (Next.js 16 / Shopify Storefront).
Ordered most critical → least. Each item has a file reference and a one-line fix.

> Baseline: `yarn lint-ts` passes, 245 tests pass. Items below are issues the
> passing suite does not catch.

---

## High

4. **Unthrottled public wishlist read actions** — `src/actions/wishlistActions.ts:44,53`
   `getWishlistIdsAction` / `getWishlistProductsAction` have no `isRateLimited` (unlike writes), so Storefront quota can be drained in a loop.
   _Fix: rate-limit reads via `getClientIp()` with `failClosed:false`._

5. **`normalizeMenuHref` has zero test coverage** — `src/utils/url.ts:39`
   The function guarding all CMS navigation is untested (see `url.test.ts`; no protocol cases).
   _Fix: cover internal/external/javascript:/malformed inputs, paired with item 1._

6. **Unguarded `JSON.parse` on consent cookie** — `src/components/CookieBanner.tsx:36`
   A malformed `localConsent` cookie throws and breaks the banner and consent gating.
   _Fix: wrap in `try/catch` (mirror `GtmScript.tsx:23-31`)._

7. **Wishlist stuck on skeletons after a failed fetch** — `src/app/account/wishlist/_components/WishlistContent.tsx:36`
   `.catch` only logs and never sets `productsLoaded`, so failure pins the skeleton forever.
   _Fix: set `productsLoaded(true)` in `.finally`._

8. **Wishlist toggle has no real 'pending' signal** — `src/contexts/UserContext/UserContext.tsx:129`
   `startTransition(async …)` returns immediately, so `ProductCardActions.tsx:31-39` clears loading before the write lands and the awaited result is meaningless.
   _Fix: drive loading from optimistic state or return/await the async body._

9. **`redirect()` inside an imperatively-called address action is caught and logged as an error** — `src/app/account/addresses/_components/Address.tsx:42,57,133,146`
   `deleteAddressAction`/`setDefaultAddressAction` `redirect()` on success; the resulting `NEXT_REDIRECT` is swallowed by `.catch(... console.error ...)`.
   _Fix: use `useActionState` / form actions instead of imperative calls._

10. **Untrusted `syclid` interpolated into reset URL** — `src/app/(auth)/reset_password/page.tsx:33`
    `` `${reset_url}?syclid=${syclid}` `` allows query-param injection / broken reset links.
    _Fix: `const u = new URL(reset_url); u.searchParams.set('syclid', syclid);`._

11. **Multi-value filters silently corrupted** — `src/app/collections/_components/Filters.tsx:99`
    `new URLSearchParams(query as Record<string,string>)` comma-joins a `string[]` `filters` value, breaking multi-filter navigation (`:61-74` expects repeats).
    _Fix: append each value individually._

12. **Coverage thresholds far below the configured floor** — `vitest.config.ts` (lines 35/68/74) vs actual
    Actual: statements/lines `56%`, branches `82%`, functions `76%`; contexts/hooks/services diverge widely (`CartContext` 0%, `UserContext` 0%).
    _Fix: raise measured coverage on `actions/`, `lib/`, `services/` rather than only skeleton files._

---

## Medium

13. **Missing `aria-current` and `aria-label` on breadcrumbs** — `src/components/Breadcrumbs.tsx:78,85`
    Explicitly required by AGENTS.md WCAG rules.
    _Fix: `aria-label="Breadcrumb"` and `aria-current="page"` on the last crumb._

14. **Unnamed price slider** — `src/app/collections/_components/Filters.tsx:269`
    _Fix: pass `aria-label="Price range"` (and label each thumb; see item 30)._

15. **Label points at a non-input** — `src/components/QuickBuyContent.tsx:239`
    `<label htmlFor="quantity">` targets no element (`QuantityStepper` renders a `<span>`).
    _Fix: remove the label or wire `aria-labelledby` to the stepper._

16. **Search suggestions never announced** — `src/components/SearchResults.tsx:126-153`, `src/components/Search.tsx:98`
    No `role`/`aria-live`, violating the mandated live region for search results.
    _Fix: `role="listbox"` + `aria-live="polite"`._

17. **Wasted Storefront request on empty search** — `src/app/search/page.tsx:57`
    `searchProducts` runs before the `hasQuery` guard (only used at `:114`).
    _Fix: early-return on empty query._

18. **Heading order skipped on listings** — `src/components/ProductCardDefault.tsx:129`
    Product titles are `<h3>` directly under the page `<h1>` (no `<h2>`).
    _Fix: add an `h2` (even `sr-only`) to listing headers._

19. **Raw `console.error` bypasses `reportError` and is stripped in prod** — `src/app/sitemap.ts:75,79`, `src/app/cart/_components/CartRemove.tsx:29`, `src/app/cart/_components/DiscountCodes.tsx:42,72`, `src/app/account/addresses/_components/Address.tsx:134,147`, `src/lib/client/cookies.ts:51`
    _Fix: route all through `@/lib/logger`._

20. **Blank account page on missing `pageInfo`** — `src/app/account/addresses/page.tsx:88`
    `if (!pageInfo) return null;` renders nothing.
    _Fix: render an `EmptyState`/error fallback._

21. **`process.env` read outside the config layer** — `src/components/GtmScript.tsx:13`, `src/actions/contactActions.ts:70`
    Violates the AGENTS "never `process.env` directly in components" rule.
    _Fix: expose via `src/config/env.ts`._

22. **Contradictory controlled/uncontrolled checkbox** — `src/app/account/update/_components/UpdateUserForm.tsx:119`
    `<Checkbox>` gets both `defaultChecked` and `checked`.
    _Fix: keep only `checked` + `onCheckedChange`._

23. **Heading nested inside a button; decorative icons not hidden** — `src/app/account/_components/OrderCard.tsx:130,138,161,167`
    _Fix: move the heading out of the collapse button and add `aria-hidden` to icons._

24. **Misleading cart link label** — `src/components/UserButtons.tsx:45`
    `aria-label="Toggle Checkout"` on a navigating link.
    _Fix: `aria-label="Cart"`._

25. **`target="_blank"` without `noopener`** — `src/components/Footer.tsx:45`
    _Fix: `rel="noopener noreferrer"` (matches `sanitize.ts:79`)._

26. **Key collisions on option/thumbnail lists** — `src/app/cart/_components/LineItem.tsx:66`, `src/components/PhotoGallery.tsx:151`
    `key={option.name}` / `key={image.src}` can repeat.
    _Fix: use the index (or a composite key); add `type="button"` to thumbnail buttons._

27. **Duplicate sort-key logic** — `src/app/search/page.tsx:33` reimplements `normalizeSortKey` from `src/lib/server/collection.ts:30`
    _Fix: import the shared helper._

28. **Silent form-level validation failures** — `src/utils/form-actions.ts:7`
    `zodErrorsToFormState` drops object-level (`superRefine`) issues → `{ ok:false }` with no message.
    _Fix: surface `zodError.formErrors.formErrors`._

29. **Explicit `first: 0` coerced to `10`** — `src/shopify/helpers.ts:20`
    `const count = first || 10`.
    _Fix: `first ?? 10`._

30. **Unnamed slider thumbs in the primitive** — `src/components/ui/slider.tsx:48`
    No `aria-label`/`aria-valuetext` plumbing → any caller that forgets ships an unnamed slider.
    _Fix: default thumb labels in the primitive._

31. **Over-broad log redaction** — `src/lib/logger.ts:24`
    The `[a-zA-Z0-9]{32,}` rule mangles legitimate long identifiers.
    _Fix: anchor redaction to `key=value`/token shapes._

---

## Low

32. **`/accounting` matches the account guard** — `src/proxy.ts:27`
    `pathname.startsWith('/account')` also matches unrelated paths.
    _Fix: `pathname === '/account' || pathname.startsWith('/account/')`._

33. **Decorative icons missing `aria-hidden`** — `src/components/CheckoutButton.tsx:16`, `src/app/account/_components/RecentOrdersPreview.tsx:24,30,61`, `src/app/account/addresses/_components/Address.tsx:71`
    _Fix: add `aria-hidden="true"`._

34. **Inert `title` on a form** — `src/app/(legal)/contact/_components/ContactForm.tsx:43` — remove.

35. **Inconsistent active-path detection in the menu** — `src/components/HamburgerMenu.tsx:77`
    Strict `pathname === href` misses nested routes; `DesktopNav.tsx:31` is correct.
    _Fix: reuse `isActivePath`._

36. **Dead `name` key in register initial state** — `src/app/(auth)/register/_components/RegisterForm.tsx:37` — remove.

37. **`redirectUrl` validated then ignored on register** — `src/actions/authActions.ts:35,47`
    _Fix: remove the field or honour it via `safeInternalPath`._

38. **JS-only logout has no no-JS fallback** — `src/app/account/logout/_components/LogoutClientEffect.tsx:18`
    _Fix: render a visible submit button as fallback._

39. **Documentation drift** — `README.md:31` states "Node.js 20.9+ (recommended 22+)"
    Actual engines require Node `24.x` (`.nvmrc`, `package.json:7`).
    _Fix: correct the README prerequisite._

40. **~27 stale `snyk-fix-*` / `dependabot/*` branches on `origin`** — remote only
    _Fix: merge or delete after triage to reduce noise and stale-dependency security surface._
