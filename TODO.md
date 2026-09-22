# Global Project Audit — TODO

### P2 — Medium

### [ ] Add a 404 page and fix Suspense boundaries

**Why:** `notFound()` is called (`products/[productSlug]/page.tsx:100`) but no `not-found.tsx`
exists, so users get an unstyled default 404. `Sort.tsx:26` reads `useSearchParams` without a
`Suspense` boundary — currently masked only because those routes are dynamic.

**Where:** add `src/app/not-found.tsx`; `src/app/collections/_components/Sort.tsx:26`.

**Change:** Add a branded root `not-found.tsx` and wrap `Sort` in `<Suspense>`.

**Impact:** Medium

### [ ] Cut redundant product queries and ineffective revalidation

**Why:** The PDP does three sequential Shopify round-trips (metadata, body, recommendations)
and `revalidatePath` is called on every mutation against routes already `force-dynamic`, adding
overhead with no effect.

**Where:** `src/app/collections/products/[productSlug]/page.tsx:52-106`;
`src/services/cart.service.ts:136,221-223`; `src/services/address.service.ts`; `src/services/user.service.ts:59`.

**Change:** Run independent queries with `Promise.all`, memoize product lookups, and drop
`revalidatePath` for dynamic routes (rely on server-action refresh).

**Impact:** Medium

### [ ] Config, env and docs hygiene

**Why:** Docs and config have drifted from the code, which misleads contributors and hides real
requirements.

**Where:** `README.md` (test script/name/structure drift, env table); `src/config/env.ts` only
validates a subset of the `NEXT_PUBLIC_SITE_*` vars actually used (e.g. `NEXT_PUBLIC_SITE_NAME`);
`components.json` alias `@/lib/utils`; `jsconfig.json` duplicates `tsconfig.json`; empty `TODO.md`
was the only tracked TODO.

**Change:** Align README with `package.json` and the real tree, validate the site-metadata env
used by `config/index.ts`/`data/siteMetadata.ts`, fix or drop the dead aliases.

**Impact:** Low

### [ ] Slim the generated Shopify Admin SDK

**Why:** `src/shopify/admin/index.ts` is 63k lines, but only two Admin operations
(`delegateAccessTokenCreate`, `MetafieldsSet`) are used — it inflates type-check and bundle
analysis.

**Where:** `codegen.admin.ts`; `src/shopify/admin/index.ts`.

**Change:** Enable `onlyOperationTypes` (and near-operation-file output) in the Admin codegen
config so only used operations are emitted, rather than the full schema.

**Impact:** Low

### [ ] Add regression tests for the corrected flows

**Why:** Unit coverage is decent for utils/services but none of the P0/P1 fixes are guarded by
tests, so they can silently regress.

**Where:** `src/app/api/search/predictive/*`, `src/actions/*`, cookie/session helpers.

**Change:** Add focused tests: predictive response contract, login open-redirect rejection,
logout cookie clearing (with/without `domain`), cart input validation bounds.

**Impact:** Medium
