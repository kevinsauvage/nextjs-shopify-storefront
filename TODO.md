# TODO — Global Project Audit

### P2 — Medium

### [ ] Rework logout into a server action

**Why:** `/account/logout` POSTs `/api/logout`, then waits 2s before redirecting, and the API route calls a
server action to delete a cookie. This is slow, fragile and unnecessarily layered.

**Where:** `src/app/account/logout/page.tsx`, `src/app/account/logout/_components/LogoutClientEffect.tsx`,
`src/app/api/logout/route.ts`.

**Change:** Implement logout as a server action/form that revokes the Shopify token, clears cookies, and
redirects immediately.

**Impact:** Medium

### [ ] Add error reporting and structured logging

**Why:** Failures are only `console.error`-logged (and `removeConsole` strips most console output in
production), so production errors are effectively invisible.

**Where:** `src/app/error.tsx`, `src/app/global-error.tsx`, `src/utils/api-responses.ts` (`safeLogError`).

**Change:** Add a single error-reporting hook (e.g. Sentry or a logging drain) and structured logs with
request/operation context.

**Impact:** Medium

### [ ] Tighten production security headers

**Why:** The CSP allows `'unsafe-eval'` and `'unsafe-inline'` scripts in production, where `unsafe-eval` is
not required by Next.js.

**Where:** `next.config.ts` (`headers()`).

**Change:** Drop `'unsafe-eval'` in production and reduce inline-script reliance (nonce or hashes where
feasible).

**Impact:** Medium

## Biggest Wins

1. Fix catalog/nav routing (missing `/collections`, wrong order links, relative-URL crash) — restores the
   primary browse flow.
2. Fix cart ↔ customer association after login — makes customer pricing/checkout identity actually work.
3. Remove the per-request Admin call and make Admin optional/lazy — removes a global failure mode and a
   blocking round trip on every request.
4. Lock down cookie server actions and harden the contact action — closes two real abuse vectors.
5. Collapse the actions/services/API/self-HTTP layers into one boring path — removes the complexity that
   produced the cart bug and speeds up future work.

## Target State

- Every advertised route resolves; all internal links use the canonical product/collection URLs.
- Header, mobile menu and search navigation work with real Shopify menus.
- Storefront-only deployments boot with just the two required Shopify env vars; Admin features degrade
  gracefully when unconfigured.
- Login/register reliably attach the cart to the customer without an internal HTTP hop.
- One obvious place for each mutation (server actions/services); API routes only for genuine client fetches.
- Pages render with only the Shopify data they need; the root layout does no per-request wishlist/user work.
- Sitemap/robots list only public, indexable URLs; private routes are excluded.
- `yarn lint`, `yarn lint-ts` and the test suite are green in CI, and codegen failures fail the build.
- Images are optimized; dead code, empty routes and unused config are gone.
- Errors are observable in production via a real reporting/logging path.
