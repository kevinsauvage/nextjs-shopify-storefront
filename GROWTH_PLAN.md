# Shopify Growth Plan — Remaining Roadmap

## 1. TL;DR

| Area                              | Verdict                                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core commerce + search/retention  | **Shipped** — catalog, cart, checkout, auth, orders, Pages CMS, activation, order detail, cart extras, newsletter, recently-viewed + search upgrade |
| Shopify API surface still unwired | Blog, localization/markets, customer metafields, pickup/delivery, Multipass                                                                         |
| Biggest remaining levers          | Content-led SEO (blog), Markets/i18n, reviews, loyalty                                                                                              |
| Suggested order                   | P1 = content + markets + retention → P2 = subscriptions, bundles, pickup, loyalty, SSO                                                              |

## 2. Shopify API capacity audit

### 2.1 Defined in `.graphql` but never called (dead capacity — wire or delete)

Verified by searching `src` excluding generated `shopify/*/index.ts`, `*.graphql`, `*.test.*`:

| Operation (file)                                              | What it unlocks                                    | Recommendation                                                                                   |
| ------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `getBlogByHandle` (`shopQueries.graphql`)                     | Blog + articles (lookbook, journal, SEO content)   | **P1 — build `/blog` + `/blog/[handle]`**; add articles to sitemap                               |
| `getShopMetaobjectByHandle` (`shopQueries.graphql`)           | Single metaobject as CMS (hero, promo, size chart) | **P1 — pick one use-case** and ship a section (`getShopMetaObjects` now powers popular searches) |
| `getLocalization` (`shopQueries.graphql`)                     | Countries/languages/currencies (Markets)           | **P1 — markets & i18n** (see §3)                                                                 |
| `checkoutURL` query (`cart.graphql`)                          | Localized checkout URL                             | **P1 — wire with markets**; delete if markets stay out of scope                                  |
| `getCustomerMetafields` (`customer.graphql`)                  | Loyalty points, preferences, sizes                 | **P1 — loyalty / preference center**                                                             |
| `getShopProductTags` (`shopQueries.graphql`)                  | Tag cloud / tag landing pages                      | **P2 — optional**                                                                                |
| `customerAccessTokenCreateWithMultipass` (`customer.graphql`) | SSO / passwordless / external IdP                  | **P2 — only if SSO needed**; otherwise delete to reduce surface                                  |

### 2.2 Storefront API capabilities never modeled at all

| Capability                                                  | Status                                   | Opportunity                                                     |
| ----------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Cart buyer identity (delivery address, pickup, email/phone) | Only used for cart-merge on login        | P1 — delivery estimator / pickup selection pre-checkout         |
| Internationalization (`@inContext` on some queries)         | No locale routing, no currency switcher  | P1 — `/[locale]` or cookie-based market switcher                |
| Blog articles, Pages                                        | Pages shipped; blog still missing        | P1 — content-led SEO                                            |
| Metaobject CMS sections                                     | Popular searches shipped; sections not   | P1 — merchandiser-editable hero/promo/size-chart sections       |
| Discount auto-apply / promo banners                         | Discount codes work; no auto-highlight   | P1 — promo banner driven by metaobject + discount introspection |
| Product media (3D, video), `sellingPlanGroups`              | Not queried in `ProductDetails` fragment | P2 — subscriptions, media gallery upgrade                       |
| Product bundles, combined listings                          | Not queried                              | P2 — bundle builder / shop-the-look                             |
| Returns / exchanges, store credit                           | Nothing                                  | P2 — self-serve returns via Admin API or app                    |

### 2.3 Admin API — lightly used

Currently `delegateAccessTokenCreate`, `MetafieldsSet` (wishlist) and
`customerCreate` (newsletter). Untapped but legitimate server-side uses:
inventory-location reads for pickup availability, scheduled content sync (CRON →
metaobjects), customer tagging. Keep Admin usage server-only (already the pattern)
and do **not** expand scopes without review (`Ask first` in `AGENTS.md`).

## 3. Remaining feature gaps (product view)

### P1 — Content, markets, retention (1–3 sprints)

1. **Blog / journal** — `/blog`, `/blog/[handle]`, article cards, related articles, sitemap +
   `Article` JSON-LD. Uses dead `getBlogByHandle` (add an `articles` sub-query if missing).

2. **Metaobject CMS sections** — homepage hero, promo bar, size chart, FAQ accordion; one
   `getShopMetaobjectByHandle` per section type; document handles in README.

3. **Localization / Markets** — wire `getLocalization`, add country/language + currency selector,
   persist in cookie, thread `@inContext(country/language)` through product/cart/search queries;
   localized `checkoutURL`. Needs IA decision: path (`/fr/...`) vs. cookie.

4. **Reviews** — no native Storefront reviews object; standard approach is a Product Reviews app /
   metaobject-backed reviews + aggregate rating JSON-LD. Pick provider before building.

5. ~~**Wishlist hardening**~~ — **Shipped**: guest → login merge (union, capped at 100 — documented in the service/README), share-wishlist link (`/wishlist/shared?ids=…`), move-to-cart.

6. **GTM Enhanced Ecommerce** — `view_item`, `add_to_cart`, `begin_checkout`, `purchase`
   (post-checkout thank-you is on Shopify — use web pixels or checkout extensibility note).

### P2 — Differentiators (needs scoping)

7. **Subscriptions** — query `sellingPlanGroups`, variant-level plan selector, manage-subscription
   link to customer portal.

8. **Bundles / shop-the-look** — combined listings or manual bundle section with a single
   `cartLinesAdd`.

9. **Pickup + delivery estimate** — buyer identity + location inventory pre-checkout.

10. **Loyalty / referral** — metafields-backed points display; provider (Yotpo/LoyaltyLion) vs. custom.

11. **Multipass SSO** — only if an external IdP exists; adds secret handling + `Ask first` review.

12. **PWA / offline cart draft, AI search/sizing, visual search** — validate demand first.

## 4. Recommended build order

| Sprint     | Items                                     | Why                                     |
| ---------- | ----------------------------------------- | --------------------------------------- |
| Sprint 1   | P1 #1–#2 (blog, metaobject hero)          | Content-led SEO + merchandiser autonomy |
| Sprint 2–3 | P1 #3 (markets / i18n)                    | International revenue                   |
| Sprint 4   | P1 #5–#6 (wishlist hardening, GTM events) | Retention + measurement                 |
| Sprint 5   | P1 #4 (reviews)                           | Social proof                            |
| Sprint 6+  | P2 shorts                                 | Differentiators                         |

Each item: colocated `*.test.ts` for actions/services/lib changes (per `AGENTS.md`), focused
`yarn vitest run <path>` → `yarn test:coverage`, `yarn lint`, `yarn typegen && yarn lint-ts`.

## 5. Metrics to attach per feature

- Content (blog/pages/metaobjects): publishing lead time, organic sessions, assisted conversions.
- Markets: intl conversion vs. domestic, FX/bounce deltas.
- Search: zero-result rate, CTR on suggestions, search-to-cart rate.
- Reviews: review coverage, PDP conversion delta.
- Retention: repeat-purchase rate, recently-viewed → cart rate.

## 6. Open questions for the owner

1. Markets: which countries/currencies first, and path- vs. cookie-based locale?
2. Reviews provider (or none)?
3. Newsletter destination (Shopify Email/Klaviyo/other) and consent wording?
4. Subscriptions: real demand or skip?
5. Multipass/SSO: any IdP on the roadmap, or delete the mutation?
6. Returns: self-serve in-store or provider-hosted?
