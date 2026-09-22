# Project Audit — TODO

Audit of the Next.js 16 / React 19 Shopify storefront at `Ecommerce-portfolio`.
Legend: **P0** = critical (data loss/leak, broken checkout, security, or no safety net) · **P1** = important.

> **Easy wins landed** (see "Completed in this pass" at the bottom). Remaining items are the ones
> that need design decisions, schema/query changes, or broader refactors.

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
