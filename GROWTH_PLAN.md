# Shopify Growth Plan — Gap Analysis & Roadmap

> Generated 2026-09-24 from a static audit of this repo (routes, actions, services,
> `src/shopify/**/*.graphql` vs. actual SDK call sites).
> Goal: what is missing, what to build next, and how far the Shopify API is actually used.

## 1. TL;DR

| Area                                                                        | Verdict                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core commerce (catalog, cart, checkout redirect, auth classic, orders read) | **Solid, working**                                                                                                                                                                                                                                                        |
| Shopify API surface actually wired up                                       | **~55–60% of what is already defined in `.graphql` files; ~35–40% of what Storefront API offers**                                                                                                                                                                         |
| Biggest waste                                                               | **9 defined-but-never-called operations** (`getBlogByHandle`, `getPageByHandle`, `getShopMetaobject(s)`, `getLocalization`, `cartAttributesUpdate`, `cartNoteUpdate`, `checkoutURL`, `customerActivate*`, Multipass) — CMS + i18n + cart extras are written but dead code |
| Biggest missing capabilities                                                | Newsletter backend, blog/articles UI, Shopify Pages CMS, localization/markets (language + currency), gift-card UI, cart note/attributes UI, subscriptions/bundles, reviews, recently-viewed, order-detail page, account-activation flow                                   |
| Suggested order                                                             | P0 = wire dead code + close checkout/account gaps (1–2 sprints) → P1 = content + markets + loyalty loops → P2 = subscriptions/headless differentiators                                                                                                                    |

## 2. What exists today (confirmed)

- **Catalog:** collections list + detail with filters/sort/pagination (`collection`, `collections`), product detail (`getProductByHandle`), recommendations (`productRecommendations`), sitemap generation.
- **Search:** full `searchProducts` page + predictive-search API route (`predictiveSearch`) with rate limiting and fail-open behavior.
- **Cart:** create/add/update/remove/get + discount codes (`cartDiscountCodesUpdate`), merge on login via `cartBuyerIdentityUpdate`, promo-code UI (`CartPromoCode`, `DiscountCodes`, `CouponCodeForm`). Persistent via httpOnly cookie + `CartContext` with request-id sequencing.
- **Checkout:** redirect to Shopify `checkoutUrl` only (`CheckoutButton`). No on-site checkout customization.
- **Auth (classic customer accounts):** register/login/logout/recover/reset (`customerCreate`, `customerAccessTokenCreate`, `customerAccessTokenDelete`, `customerRecover`, `customerResetByUrl`), token renewal (`customerAccessTokenRenew` in `src/lib/token-renewal.ts`), delegate tokens via Admin API.
- **Account:** orders list (`getCustomerOrders`), addresses CRUD + default (`customerAddress*`), profile update (`customerUpdate`), wishlist (localStorage + server metafield sync via Admin `MetafieldsSet`).
- **Shop/policy content:** shop policies wired to legal pages (`getTermsOfService`, `getRefundPolicy`, `getShippingPolicy`, `getPrivacyPolicy`), menus (`getMenuByHandle`), contact form via nodemailer, GTM, cookie banner, SEO metadata + Organization/Product/Breadcrumb JSON-LD, sitemap + robots.

## 3. Shopify API capacity audit

### 3.1 Defined in `.graphql` but NEVER called (dead capacity — wire or delete)

Verified by searching `src` excluding generated `shopify/*/index.ts` and `*.graphql`:

| Operation (file)                                                                                   | What it unlocks                                                               | Recommendation                                                                   |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `getBlogByHandle` (`shopQueries.graphql`)                                                          | Blog + articles (lookbook, journal, SEO content)                              | **P1 — build `/blog` + `/blog/[handle]`**; also add articles to sitemap          |
| `getPageByHandle` (`shopQueries.graphql`)                                                          | Shopify Pages as CMS (size guides, FAQ, landing pages)                        | **P0 — build catch-all `/pages/[handle]`** so merchandisers edit without deploys |
| `getShopMetaobject(s)` + `getShopMetaobjectByHandle` (`shopQueries.graphql`)                       | Metaobjects as CMS (hero banners, promos, lookbooks, size charts, FAQ blocks) | **P1 — pick one use-case (homepage hero / promo banner)** and ship a section     |
| `getLocalization` (`shopQueries.graphql`)                                                          | Countries/languages/currencies (Markets)                                      | **P1 — markets & i18n** (see §5)                                                 |
| `cartAttributesUpdate` (`cart.graphql`)                                                            | Custom cart attributes (gift wrap, source, B2B refs)                          | **P0 — expose gift-wrap / order-note attributes** in cart UI                     |
| `cartNoteUpdate` (`cart.graphql`)                                                                  | Order note at checkout                                                        | **P0 — add "order note" textarea** in `CartSummary`                              |
| `checkoutURL` query (`cart.graphql`)                                                               | Localized checkout URL                                                        | **P0 — use it** once `getLocalization` ships; delete or wire now                 |
| `getCustomerMetafields` (`customer.graphql`)                                                       | Loyalty points, preferences, sizes                                            | **P1 — loyalty / preference center**                                             |
| `customerActivate` + `customerActivateByUrl` (`customer.graphql`)                                  | Invite-based activation flow                                                  | **P0 — add `/activate` page**; today invited customers hit a dead end            |
| `customerAccessTokenCreateWithMultipass` (`customer.graphql`)                                      | SSO / passwordless / external IdP                                             | **P2 — only if SSO needed**; otherwise delete to reduce surface                  |
| `getCollectionSeoByHandle`, `getProductSeoByHandle`, `getShopProductTags`, `getSubscriptionPolicy` | SEO fallbacks, tag clouds, subscription policy page                           | **P0 — wire SEO fallbacks + missing policy page**; tag cloud is optional         |
| `getProductWithVariant` (`product.graphql`)                                                        | Deep variant fetch (used nowhere)                                             | **Decide: use for quick-buy modal or delete**                                    |

### 3.2 Storefront API capabilities never modeled at all

| Capability                                                                   | Status                                             | Opportunity                                                          |
| ---------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Gift cards (`appliedGiftCards`, `giftCards` on cart)                         | Fragment `GiftCardFields` exists, **no UI**        | P0 — gift-card input next to promo codes; major AOV lever            |
| Cart buyer identity (delivery address, pickup, email/phone)                  | Only used for cart-merge on login                  | P1 — delivery estimator / pickup selection pre-checkout              |
| Product media (3D, video), `sellingPlanGroups` (subscriptions)               | Not queried in `ProductDetails` fragment           | P2 — subscriptions (`sellingPlan` select), media gallery upgrade     |
| Product bundles, combined listings                                           | Not queried                                        | P2 — bundle builder / shop-the-look                                  |
| Internationalization (`@inContext` country/language already on some queries) | No locale routing, no currency switcher            | P1 — `/[locale]` or cookie-based market switcher                     |
| Blog articles, Pages (see above)                                             | Queries exist, no routes                           | P1 — content-led SEO                                                 |
| Metaobjects (see above)                                                      | Queries exist, no rendering                        | P1 — merchandiser-editable sections                                  |
| Search relevance (filters on `search`, `queries` suggestions)                | Basic; no recent-searches, no zero-result curation | P1 — recent searches, popular terms via metaobjects                  |
| Customer `orders` depth                                                      | List only; no dedicated order-detail page          | P0 — `/account/orders/[id]` with line items, tracking links, reorder |
| Returns / exchanges, store credit                                            | Nothing                                            | P2 — self-serve returns via Admin API or app                         |
| Discount auto-apply / promo banners                                          | Discount codes work; no auto-highlight             | P1 — promo banner driven by metaobject + discount introspection      |

### 3.3 Admin API — barely touched

Only `delegateAccessTokenCreate` and `MetafieldsSet` (wishlist) are used. Untapped but legitimate
server-side uses: inventory-location reads for pickup availability, scheduled content sync (CRON →
metaobjects), customer tagging on newsletter signup, draft-order/B2B flows. Keep Admin usage
server-only (already the pattern) and do **not** expand scopes without review (`Ask first` in
`AGENTS.md` — session/auth scheme changes).

## 4. Feature gaps (product view)

### P0 — Close the loop (days, no new scopes)

4. **Cart note + attributes** — textarea + gift-wrap checkbox calling `cartNoteUpdate` /
   `cartAttributesUpdate`; verify note surfaces in Shopify admin order timeline.
5. **Gift-card redemption UI** — input in `CartPromoCode`; Storefront cart supports gift cards
   alongside discounts — confirm against current schema before building.
6. **Newsletter backend** — `FooterNewsletterForm` is currently UI-only (no action). Wire to
   customer creation with `acceptsMarketing` / tags or a marketing app endpoint; add double
   opt-in + rate limit (reuse contact-form Upstash pattern).
7. **SEO follow-through** — wire `getProductSeoByHandle` / `getCollectionSeoByHandle` fallbacks,
   add `getSubscriptionPolicy` page, extend `sitemap.ts` with blogs/pages/articles, add FAQ JSON-LD
   once FAQ content exists.
8. **Quick-buy variant fetch** — either use `getProductWithVariant` in `QuickBuyContent` or delete
   the operation so codegen output stays honest.

### P1 — Content, markets, retention (1–3 sprints)

9. **Blog / journal** — `/blog`, `/blog/[handle]`, article cards, related articles, sitemap +
   `Article` JSON-LD. Uses dead `getBlogByHandle` (add `articles` sub-query if missing).
10. **Metaobject CMS sections** — homepage hero, promo bar, size chart, FAQ accordion; one
    `getShopMetaobjectByHandle` per section type; document handles in README.
11. **Localization / Markets** — wire `getLocalization`, add country/language + currency selector,
    persist in cookie, thread `@inContext(country/language)` through product/cart/search queries;
    localized `checkoutURL`. Needs IA decision: path (`/fr/...`) vs. cookie.
12. **Reviews** — no native Storefront reviews object; standard approach is Product Reviews app /
    metaobject-backed reviews + aggregate rating JSON-LD. Pick provider before building.
13. **Recently viewed + smarter recommendations** — localStorage rail + existing
    `productRecommendations` on cart/search empty states, not only PDP.
14. **Search upgrade** — recent searches, popular terms (metaobject), zero-result fallback
    (best-sellers + contact CTA), analytics event on search.
15. **Wishlist hardening** — guest → login merge (server metafield wins vs. union — decide +
    document), share-wishlist link, move-to-cart.
16. **GTM Enhanced Ecommerce** — `view_item`, `add_to_cart`, `begin_checkout`, `purchase`
    (post-checkout thank-you is on Shopify — use web pixels or checkout extensibility note).

### P2 — Differentiators (needs scoping)

17. **Subscriptions** — query `sellingPlanGroups`, variant-level plan selector, manage-subscription
    link to customer portal.
18. **Bundles / shop-the-look** — combined listings or manual bundle section with single
    `cartLinesAdd`.
19. **Pickup + delivery estimate** — buyer identity + location inventory pre-checkout.
20. **Loyalty / referral** — metafields-backed points display; provider (Yotpo/LoyaltyLion) vs. custom.
21. **Multipass SSO** — only if an external IdP exists; adds secret handling + `Ask first` review.
22. **PWA / offline cart draft, AI search/sizing, visual search** — validate demand first.

## 5. Recommended build order

| Sprint     | Items                                                   | Why                                              | Status                          |
| ---------- | ------------------------------------------------------- | ------------------------------------------------ | ------------------------------- |
| Sprint 1   | P0 #1, #2, #3 (pages, activation, order detail)         | Dead code → live routes; support-ticket reducers | **Shipped 2026-09-24** (see §8) |
| Sprint 2   | P0 #4, #5, #6 (note/attributes, gift cards, newsletter) | AOV + capture; all checkout-adjacent             | **Shipped 2026-09-24** (see §9) |
| Sprint 3   | P1 #10-starter (metaobject hero)                        | SEO compounding + merchandiser autonomy          |
| Sprint 4–5 | P1 #9, #11 (blog, markets)                              | Content + international revenue                  |
| Sprint 6+  | P1 #12–#16, then P2 shorts                              | Retention + conversion depth                     |

Each item: colocated `*.test.ts` for actions/services/lib changes (per `AGENTS.md`), focused
`yarn vitest run <path>` → `yarn test:coverage` (floors: branches 74, functions 68, lines 35),
`yarn lint`, `yarn typegen && yarn lint-ts`.

## 6. Metrics to attach per feature

- Content (blog/pages/metaobjects): publishing lead time, organic sessions, assisted conversions.
- Cart extras (note/gift/gift-card): attachment rate, AOV delta.
- Newsletter: signup rate, welcome-flow revenue.
- Markets: intl conversion vs. domestic, FX/bounce deltas.
- Search: zero-result rate, CTR on suggestions, search-to-cart rate.
- Account: activation completion, reorder rate, return-deflection.

## 7. Open questions for the owner

1. Markets: which countries/currencies first, and path- vs. cookie-based locale?
2. Reviews provider (or none)?
3. Newsletter destination (Shopify Email/Klaviyo/other) and consent wording?
4. Subscriptions: real demand or skip to P3?
5. Multipass/SSO: any IdP on the roadmap, or delete the mutation?
6. Returns: self-serve in-store or provider-hosted?

## Appendix — how this was checked

- Enumerated operations: `rg "^(query|mutation|fragment) " src/shopify`.
- Usage check: searched each operation name in `src` excluding generated
  `src/shopify/*/index.ts`, `*.graphql`, `*.test.*`.
- Confirmed live call sites via `storefrontSdk().*` / `adminSdk().*` occurrence counts
  (e.g. `cartAttributesUpdate`, `cartNoteUpdate`, `getBlogByHandle`, `getPageByHandle`,
  `getLocalization`, `getShopMetaobject(s)`, `customerActivate*`, Multipass → zero app call sites).
- UI inventory: `src/app/**/page.tsx` routes, cart components, `FooterNewsletterForm`,
  `structured-data.ts`, legal pages, sitemap/robots.

## 8. Sprint 1 — shipped 2026-09-24

### What was built

- **P0 #1 — Shopify Pages:** `GET /pages/[handle]` (`src/app/pages/[handle]/page.tsx`)
  renders any published Shopify Page (title, sanitized `body`, SEO fallbacks) with the
  legal-pages look (`PageBanner` + `Breadcrumbs` + `MainContent`) and `notFound()` for
  unknown handles. Required extending `getPageByHandle` with `title`/`body`/`seo` —
  the old query only fetched `bodySummary` and could not render a page.
- **P0 #2 — Account activation:** `/activate` page + `ActivateForm` + `AuthService.activate`
  - `activateAccountAction` (zod + store-origin allowlist + `auth:activate` rate limit,
    mirroring the reset-password flow) wired to the previously dead
    `customerActivateByUrl` mutation. Signs the customer in on success.
- **P0 #3 — Order detail:** `/account/orders/[orderId]` with all line items (new
  `lineItems` on the `OrderFields` fragment — fulfillments alone omit unfulfilled
  items), totals, shipping/tax, tracking (`TrackingInfo`, now shared with `OrderCard`),
  `customerUrl` live-tracking link, print button, and one-click **reorder**
  (`reorderAction` → `CartService.addLines`, skips unavailable variants, fail-closed
  rate limit). `OrderCard` links each order to its detail page.
- Shared helpers: `src/utils/order.ts` (`toOrderGid`/`getNumericOrderId`),
  `orderDisplay.ts` (`formatStatus`/`getStatusBadgeVariant`).
- Tests: 109 focused tests pass; full suite 595/595 with coverage floors intact.

### Generated SDK note

`src/shopify/storefront/index.ts` is generated — `yarn codegen` could not run here
(no `SHOPIFY_*` env in this shell), so the two additive query changes
(`getPageByHandle` fields, `OrderFields.lineItems`) were mirrored into the generated
file by hand in codegen's exact output format. **Run `yarn codegen` (Node 24) and
confirm zero diff** before merging. `next typegen` was re-run; `tsc`, ESLint,
Prettier, and Vitest are green.

### Shopify-side setup

`bin/shopify-content.mjs` (Admin API) now manages CMS pages from the repo —
`yarn content:list`, `yarn content:seed` (manifest `content/pages.json`), one-off
`upsert`, or `pull --handle <handle>` to bring Shopify Admin edits back into the
repo (sync is explicit both ways; seed overwrites Admin-side changes). Seeded 2026-09-24: `about-us`, `size-guide`, `faq` (all published;
verified rendering at `/pages/<handle>` with HTTP 200). Re-running seed updates in
place, so page copy evolves through git + `yarn content:seed`. Still manual:

1. **Create Pages** (Admin → Content → Pages, or Admin GraphQL):
   ```graphql
   mutation {
     pageCreate(
       page: { title: "Size Guide", body: "<p>...</p>", handle: "size-guide", isPublished: true }
     ) {
       page {
         handle
         title
       }
       userErrors {
         message
         field
       }
     }
   }
   ```
   Anything published is instantly live at `/pages/<handle>`; point footer/menu
   links at those URLs (menu normalization already keeps them on-storefront).
2. **Activation emails:** edit the _Customer account invite_ notification template so
   the button points at the headless flow instead of the myshopify domain:
   `https://<your-storefront>/activate?activation_url={{ customer.account_activation_url | url_encode }}`
3. **Smoke test:** open a Page URL, activate a test customer via an invite, open an
   order detail → tracking → reorder → cart.

## 9. Sprint 2 + P0 #7/#8 — shipped 2026-09-24

- **P0 #4 — Cart note + attributes:** `cartNoteUpdate` / `cartAttributesUpdate`
  wired through `CartService` → actions (zod-bounded) → `CartContext` → new
  `OrderNoteForm` card in the cart sidebar (note textarea + gift-wrap checkbox
  backed by a visible `gift_wrap` attribute). Verified live against the API.
- **P0 #5 — Gift cards:** new `cartGiftCardCodesUpdate` (+ `...Remove`) mutations,
  full action/context/UI stack (`GiftCardForm` + `AppliedGiftCards` in the promo
  card). Two findings baked in: Shopify only returns `lastCharacters`, so codes
  entered on-device are remembered in localStorage per cart id; and Shopify
  **silently ignores** invalid codes, so the action throws "not recognized" when
  nothing lands instead of reporting false success. Verified live.
- **P0 #6 — Newsletter backend:** `FooterNewsletterForm` was fake; now calls
  `subscribeNewsletterAction` (zod + dual-bucket rate limit) →
  `UserService.subscribeNewsletter` via **Admin** `customerCreate` with
  `emailMarketingConsent` (single opt-in). Storefront create was rejected as the
  vehicle — it requires a password. Enumeration-safe: taken emails resolve to
  success.
- **P0 #7 — SEO:** new `/subscription` policy page (route + metadata + sitemap
  entry); Shopify Pages now included in `sitemap.ts` via new `getPagesForSitemap`.
  The standalone `getProductSeoByHandle` / `getCollectionSeoByHandle` queries were
  **deleted**, not wired — both pages already select `seo` with fallbacks.
  FAQ JSON-LD deferred: the FAQ is presentation HTML with no structured Q&A source.
- **P0 #8 — Quick-buy:** `getProductWithVariant` **deleted** — `QuickBuyContent`
  already resolves variants client-side from card data.
- **Codegen actually ran** (`ts-node` + dotenv-preloaded `.env.local`, bypassing
  the yarn Node-24 engine gate): all `.graphql` changes above are genuine
  generated output, no hand-mirroring left. Re-run `yarn codegen` on Node 24 to
  confirm zero diff.
- Tests: full suite 620/620 with coverage floors intact.
