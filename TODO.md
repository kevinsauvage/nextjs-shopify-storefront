# Project Audit — TODO

Audit of the Next.js 16 / React 19 Shopify storefront at `Ecommerce-portfolio`.
Legend: **P0** = critical (data loss/leak, broken checkout, security, or no safety net) · **P1** = important.

> **Easy wins landed** (see "Completed in this pass" at the bottom). Remaining items are the ones
> that need design decisions, schema/query changes, or broader refactors.

---

## Additional backlog (lower priority)

- [x] Add `noindex` metadata to cart/search/auth routes (robots disallows are in place but do not prevent indexing of linked URLs).
- [x] Pin Node (`engines` + `.nvmrc`) and align `@types/node`, CI, and Codacy (currently 16 vs 22 vs 25).
- [x] Add Prettier check, coverage thresholds, and Dependabot/`audit` to CI.
- [x] Move codegen packages and `@types/*` out of `dependencies`.
- [x] Fix `formatDate` timezone-dependent hydration mismatches (force `timeZone` or format server-side).
- [x] Use `next/image` for `OrderCard` line items; use plain `<a rel="noopener noreferrer">` for external checkout/tracking links.
- [x] Make `Breadcrumbs` resilient: safe `decodeURIComponent` (a malformed `%` currently throws during render).
- [x] Derive `Filters` price bounds from the catalog instead of a hardcoded `200`; import `SearchForm`'s label from `@/components/ui/label`.
- [x] Reduce per-card client cost: keep `ProductCardDefault` server-renderable where possible and avoid mounting `QuickBuy` per card until interaction.

---
