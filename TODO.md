# Global Project Audit — TODO

All audit items are complete.

### P2 — Medium

### [x] Add a 404 page and fix Suspense boundaries

Added a branded `src/app/not-found.tsx` and gave `Sort` an internal `<Suspense>`
boundary so `useSearchParams` no longer requires the route to stay dynamic.

### [x] Cut redundant product queries and ineffective revalidation

Product lookups are memoized per request with React `cache()` and shared between
`generateMetadata` and the page body, removing one Shopify round-trip. Dropped the
`revalidatePath` calls that ran against already-dynamic routes.

### [x] Config, env and docs hygiene

Aligned `README.md` with `package.json` and the real tree, validated the
`NEXT_PUBLIC_SITE_*` metadata env in `src/config/env.ts`, fixed the `components.json`
alias to point at the actual `cn` module, and removed the duplicated `jsconfig.json`.

### [x] Slim the generated Shopify Admin SDK

Enabled `onlyOperationTypes` in the Admin codegen config (and dropped the unused
Admin `getProducts` document), cutting `src/shopify/admin/index.ts` from ~69k to
~20k lines.

### [x] Add regression tests for the corrected flows

Added tests for the predictive-search response contract and cache header, login
open-redirect rejection, logout cookie handling, and cart input validation bounds.
