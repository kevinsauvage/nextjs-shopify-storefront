# TODO — Global Project Audit

### P2 — Medium

### [x] Rework logout into a server action

**Why:** `/account/logout` POSTs `/api/logout`, then waits 2s before redirecting, and the API route calls a
server action to delete a cookie. This is slow, fragile and unnecessarily layered.

**Where:** `src/app/account/logout/page.tsx`, `src/app/account/logout/_components/LogoutClientEffect.tsx`,
`src/app/api/logout/route.ts`.

**Change:** Implement logout as a server action/form that revokes the Shopify token, clears cookies, and
redirects immediately.

**Impact:** Medium

### [x] Add error reporting and structured logging

**Why:** Failures are only `console.error`-logged (and `removeConsole` strips most console output in
production), so production errors are effectively invisible.

**Where:** `src/app/error.tsx`, `src/app/global-error.tsx`, `src/utils/api-responses.ts` (`safeLogError`).

**Change:** Add a single error-reporting hook (e.g. Sentry or a logging drain) and structured logs with
request/operation context.

**Impact:** Medium

### [x] Tighten production security headers

**Why:** The CSP allows `'unsafe-eval'` and `'unsafe-inline'` scripts in production, where `unsafe-eval` is
not required by Next.js.

**Where:** `next.config.ts` (`headers()`).

**Change:** Drop `'unsafe-eval'` in production and reduce inline-script reliance (nonce or hashes where
feasible).

**Impact:** Medium
