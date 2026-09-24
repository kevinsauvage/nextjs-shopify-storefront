# TODO

> Generated from a full project analysis.
> P0 items (proxy session gate, reset-URL allowlist, contact CRLF) were verified
> done in the working tree — `src/proxy.ts`, `reset_password/page.tsx`,
> `src/actions/authActions.ts`, `src/actions/contactActions.ts` + colocated
> tests — and removed on 2026-09-24. Only P1 items remain.

## Summary

This is a Next.js 16 + Shopify Storefront/Admin ecommerce app (App Router, `cacheComponents: true`, Server Actions → services → `graphql-request` SDKs, Upstash rate limiting, zod validation). The codebase is well-structured with good conventions (central env validation, cookie helpers, sanitizer, per-route rate limits on auth/cart).

## Priority Overview

| Priority | Count | Meaning       |
| -------- | ----: | ------------- |
| P1       |     4 | High priority |

---

# P1 — High Priority

## P1-1 — Missing and fail-open rate limits; single shared bucket off-Vercel

**What**

`usersActions` and `addressesActions` have no `isRateLimited` at all; cart/wishlist/contact/predictive-search use `isRateLimited` without `failClosed: true`, so an Upstash outage disables throttling; `getClientIp` returns `'unknown'` on any non-Vercel host, collapsing all clients into one global bucket.

**Why**

Unauthenticated-adjacent write paths (contact) and authenticated Shopify-backed writes (profile/address updates) can be spammed to burn Shopify API quota, inflate Admin/Storefront costs, and harass the store mailbox. Fail-open means the protection disappears exactly when the backend is degraded. The `unknown`-IP collapse cuts the other way: on non-Vercel hosting, one global cart bucket (`60/m` shared worldwide) causes legitimate-user 429s (self-DoS), while on Vercel the per-IP story is fine — deployment-dependent behavior that will surprise operators.

**Evidence**

- `src/actions/usersActions.ts:20`, `src/actions/addressesActions.ts:29-97` — no `isRateLimited` import/call.
- `src/lib/server/rate-limit.ts:43-56` — fails open by default; callers without `failClosed:true`: `src/actions/cartActions.ts:48`, `src/actions/wishlistActions.ts:30`, `src/actions/contactActions.ts:53-58`, `src/app/api/search/predictive/route.ts:33`. Auth correctly uses `failClosed:true` (`src/actions/authActions.ts:59,92-95,123-126,159`).
- `src/lib/server/client-ip.ts:21-25` — only `x-vercel-forwarded-for`/`x-real-ip` trusted; otherwise `UNKNOWN_IP`.

**How**

- Add `isRateLimited` to `updateUserAction` (e.g. `user:update`, per-user-id or per-IP, ~10/10m, fail-closed) and to all four address actions (e.g. `address:write`, per-session/token-hash, ~30/m, fail-closed). Reuse the `getClientIp` + `isRateLimited` pattern from `cartActions.ts:46-51`.
- Decide the product-wide default explicitly: keep fail-open only for read/catalog paths (predictive search, cart reads); switch all mutations (cart writes, wishlist, contact, user, address) to `{ failClosed: true }`.
- For `unknown` IP: include a second key component (session/cart-id hash) when IP is `unknown`, or document "Vercel-only" as a deployment constraint; at minimum log/metric the `unknown` bucket so self-DoS is observable.
- Add tests for the new limiters (mock `isRateLimited`) and for `getClientIp` fallback.

**Done when**

- Every Server Action that writes (auth, cart, wishlist, contact, user, address) is rate-limited with an explicit `failClosed` choice; reads keep fail-open only by documented decision.
- Off-Vercel traffic no longer shares a single global mutation bucket (or the constraint is documented in README/AGENTS).
- Tests cover limited/not-limited paths for the newly guarded actions.

---

## P1-2 — Input-validation gaps across auth/user/address/cart actions

**What**

Several zod schemas are under-constrained: unbounded `firstName`/`lastName`/`company`/`phone`/`country`/`zip`; no `password.max()` (oversize-hash DoS); `email` not normalized before Shopify calls; `deleteAddressAction`/`setDefaultAddressAction` take raw `addressId: string` with zero zod validation; cart `merchandiseId`/`id` accept any 1–255-char string with no `gid://` shape check (unlike wishlist's `isValidWishlistProductId`).

**Why**

Unbounded strings flow to Shopify Admin/Storefront mutations and to transactional email — cost amplification, log bloat, and downstream validation-error leakage. Raw `addressId` relies solely on token scoping; a malformed ID becomes a Shopify error round-trip instead of a cheap local reject. Weak cart-ID shape means junk IDs burn Storefront quota. None is critical alone, but together they widen every mutation endpoint and make error behavior unpredictable.

**Evidence**

- `src/actions/authActions.ts:32-35,72-73` — `firstName/lastName: z.string()`, `password: min(6)` no max, `email` not trimmed/lowercased before service.
- `src/actions/usersActions.ts:9-16`, `src/actions/addressesActions.ts:13-25,49,64` — no `.max()`/format; address-ID actions take `addressId: string` unvalidated.
- `src/actions/cartActions.ts:23-41` — `merchandiseId/id: min(1).max(255)`, no gid regex; contrast `src/services/wishlist.service.ts:18-22` `isValidWishlistProductId`.

**How**

- Add shared bounded primitives (e.g. in `src/utils/validation.ts` or beside `form-actions.ts`): `nameField = z.string().trim().min(1).max(100)`, `passwordField = z.string().min(8).max(128)` (align register min-6 → min-8 or keep min-6 deliberately — pick one and document), `emailField = z.string().trim().toLowerCase().email().max(254)`, `gidField = z.string().regex(/^gid:\/\/shopify\//)`.
- Apply to `registerSchema`, `loginSchema`, `resetSchema`, `userSchema`, `addressSchema`; validate `addressId` with `z.string().min(1).max(128)` at minimum (gid regex if Shopify GIDs are stable); tighten cart merchandise/cart-line IDs to gid shape.
- Reuse `isValidWishlistProductId`-style validation for cart instead of inventing a second regex.
- Extend existing `authActions`/`cartActions` tests; add `addressesActions`/`usersActions` tests (currently zero).

**Done when**

- All mutation inputs have explicit `.min/.max`, email normalization, and ID shape checks; no raw-string action params remain.
- Oversized/malformed inputs are rejected locally (no Shopify round-trip) — proven by unit tests.
- Register/login/reset password minimums are consistent and documented.

---

## P1-3 — XSS defense-in-depth gaps: client-side sanitize hook, pinned DOMPurify, unvalidated GTM_ID

**What**

The `afterSanitizeAttributes` hardening (adds `rel="noopener noreferrer nofollow"`) registers only on the server (`typeof window === 'undefined'`); client-side `sanitizeHtml` calls miss it. `isomorphic-dompurify` is pinned to `2.26.0` (comment cites a Vercel `ERR_REQUIRE_ESM` issue) while upstream is at 4.x, so sanitizer fixes lag. `NEXT_PUBLIC_GTM_ID` is an unconstrained optional string interpolated into an inline `<Script>` (`'${GTM_ID}'`), and CSP relies on `script-src 'unsafe-inline'` (+ `'unsafe-eval'` in dev).

**Why**

Store HTML (`dangerouslySetInnerHTML` for product descriptions/legal policies) is correctly sanitized today, so this is defense-in-depth rather than an active XSS. But the client/server asymmetry means any future client-side sanitize call is weaker; a malformed `NEXT_PUBLIC_GTM_ID` (e.g. `x');alert(1);//`) becomes inline script content; and the pinned sanitizer plus `unsafe-inline` CSP leaves no second layer if DOMPurify misses something.

**Evidence**

- `src/utils/sanitize.ts:72-78` — hook gated on `typeof window === 'undefined'`; `ALLOWED_ATTR:56-69` includes `target/src/href` with no explicit `ALLOWED_URI_REGEXP`.
- `src/components/GtmScript.tsx:61-71` — `'${GTM_ID}'` interpolation; `src/config/env.ts:38` — `NEXT_PUBLIC_GTM_ID: optionalString`, no `^GTM-[A-Z0-9]+$` pattern.
- `next.config.ts:38-45,83` — `script-src 'self' 'unsafe-inline'` (+ dev `'unsafe-eval'`); documented trade-off for ISR/GTM.
- `package.json:51` — `isomorphic-dompurify 2.26.0` pinned; audit notes 4.x available.

**How**

- Register the `afterSanitizeAttributes` hook unconditionally (guard duplicate registration instead of gating on `window`), or set `rel` hardening via DOMPurify config so both runtimes match. Add `ALLOWED_URI_REGEXP` explicitly (default-allow `http/https/mailto`, block `javascript:/data:text/html`) rather than relying on defaults.
- Validate `NEXT_PUBLIC_GTM_ID` with `z.string().regex(/^GTM-[A-Z0-9]+$/).optional()` in `src/config/env.ts`; render the GTM snippet only when valid.
- Track the DOMPurify upgrade separately (re-test the `vercel/next.js#93901` ESM failure on a preview deployment before unpinning); do not silently stay on 2.x.
- Add client+server sanitize tests asserting `rel` hardening and `javascript:` stripping in both runtimes.

**Done when**

- `sanitizeHtml` output is identical server- and client-side for links (`rel` present, `javascript:` removed).
- Invalid `NEXT_PUBLIC_GTM_ID` values are rejected at env validation and never rendered.
- Sanitizer version policy (pinned vs upgrade path) is recorded; tests cover both runtimes.

---

## P1-4 — Security-critical code has zero tests and CI cannot block on build/audit

**What**

Per the repo's own rule ("every change in actions/services/lib/helpers" needs tests, and security-critical `proxy.ts`/rate-limit/delegate-token need new tests), coverage is missing exactly where it matters: `proxy.ts` (0/65), `rate-limit.ts` (0/33), `delegate-token.ts` (0/69), `shopify/index.ts` (0/98), and four actions (`wishlist` 0/94, `contact` 0/77, `addresses` 0/75, `users` 0/29). Meanwhile CI's production `build` job self-skips when Shopify secrets are absent, and the dependency `audit` job is `continue-on-error: true`, so known-high findings (minimatch ReDoS, brace-expansion DoS) never block.

**Why**

Untested auth/session/rate-limit code is where P0-1–P0-3 lived undetected. A green CI that skipped the build and ignored the audit gives false confidence: forks and un-provisioned branches never verify the prod build, and vulnerable transitive deps accumulate silently. Coverage floors (`branches 74 / functions 68 / lines 35`) pass only because `app/**`/`components/**`/generated SDKs are excluded and line thresholds are very low (35).

**Evidence**

- `vitest.config.ts:26-45` — excludes `app/**,components/**,types/**,shopify/*/index`; floors branches 74/functions 68/lines-statements 35.
- `coverage/lcov.info` (stale, gitignored) + audit: `src/proxy.ts:0/65`, `src/lib/server/rate-limit.ts:0/33`, `delegate-token.ts:0/69`, `src/shopify/index.ts:0/98`, `src/actions/{wishlistActions,contactActions,addressesActions,usersActions}.ts` untested; partial `token-renewal.ts:8/36`, `client-ip.ts:4/10`.
- `.github/workflows/ci.yml:69-90` — build skipped without secrets; `:109-115` — audit `continue-on-error: true` with comment "cannot fix without a major upgrade".
- `yarn audit --level high` — 5+ highs (minimatch ReDoS via eslint chain, brace-expansion DoS).

**How**

- Add colocated `*.test.ts` first for: `src/proxy.ts` (session matrix, depends on P0-1), `src/lib/server/rate-limit.ts` (fail-open vs fail-closed), `src/lib/server/delegate-token.ts` (single-flight, negative cache), `src/actions/{contact,addresses,users,wishlist}Actions.ts` (validation + limiter). Reuse existing `authActions`/`cartActions` test patterns; `server-only` is already aliased to no-op in vitest.
- Make CI honest: add `concurrency: cancel-in-progress` and per-job `timeout-minutes`; add a Shopify-mocked or `typegen`-level build check that runs without secrets so PRs always verify something build-shaped; convert `audit` to blocking once the two transitive highs are resolved (via resolutions or eslint-major upgrade track) — or at minimum fail on new highs via an allowlist file.
- Do not lower coverage floors to pass; raise `lines/statements` once the new tests land.

**Done when**

- New tests exist for `proxy`, `rate-limit`, `delegate-token`, and the four untested actions; `yarn vitest run <each>` + `yarn test:coverage` pass without lowering thresholds.
- CI runs a build-shaped check on every PR (no silent skip) and `audit` blocks on un-triaged highs.
- CI has `concurrency` + `timeout-minutes` set.

---

# Recommended Execution Order

1. P1-1 — Rate-limit the remaining mutations and fix the `unknown`-IP bucket.
2. P1-2 — Tighten zod schemas across actions (reuses the contact/reset validation patterns; establishes shared primitives).
3. P1-4 — Add the missing security tests + honest CI (locks in P1-1–P1-2; `proxy`, rate-limit, delegate-token, untested actions).
4. P1-3 — Sanitize/GTM hardening (independent; do after auth work to avoid conflicts in `env.ts`/`sanitize.ts`).

---

# Out of Scope

- README/`LICENSE`/AGENTS doc drift (stale Node/npm guidance, `[Add your license here]` placeholder, `graft/` docs): real but P2 — no runtime impact.
- Duplicated redaction helpers (`lib/logger.ts` vs `shopify/index.ts`) and `console.*` vs `reportError` inconsistencies: hygiene, not correctness/security.
- `SHOPIFY_SCOPE` free-form breadth and in-process delegate-token caching: accepted trade-offs, no evidence of over-privilege exploitation; revisit only with scoped-down Admin requirements.
- Dependency majors (zod 4, eslint 10, vitest 5, nodemailer 10): tracked by Dependabot; blocked behind test/build upgrades, not independently P1.
- `SameSite: lax` vs `strict`, cookie `Domain=` parent sharing, HSTS prod-only: deliberate, documented choices; changing them breaks SSO/subdomain flows without new evidence.

---

# Final Assessment

- P0s removed 2026-09-24: **session gating (ex-P0-1)** now validates on every
  `/account` visit and fails closed; **reset URL (ex-P0-2)** is allowlisted at
  page + action layers; **contact CRLF (ex-P0-3)** is rejected at validation
  and stripped at send time with a fail-closed limiter. Colocated tests exist
  (`src/proxy.test.ts`, `src/utils/url.test.ts`, `src/actions/authActions.test.ts`,
  `src/actions/contactActions.test.ts`) — run `yarn test:coverage` to confirm green.
- Biggest current risk: **fail-open/unlimited mutation paths (P1-1)** — remaining
  actions without explicit `failClosed` choices and the single `unknown`-IP bucket.
- Biggest technical debt: **untested security-critical paths (P1-4)** — rate-limit,
  delegate-token, and remaining mutation actions need tests per the repo rule.
- Biggest production-readiness gap: **CI that can stay green without building or
  auditing (P1-4)** — skipped prod builds and advisory-only audits hide regressions.
- What should be addressed first: **P1-1 → P1-2 → P1-4**, then P1-3.
