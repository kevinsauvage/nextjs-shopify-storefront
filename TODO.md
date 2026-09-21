# Global Project Audit — Prioritized TODO

**Why:** `getUser()` and `getShopifyToken()` are called repeatedly within a single request (account layout, page, and each service), each triggering Shopify network calls. `/account` alone resolves the customer several times.

**Where:** `src/utils/users.ts`, `src/lib/server/shopify-helpers.ts`, account pages/services.

**Change:** Wrap `getUser`/`getShopifyToken` in React `cache()` for per-request memoization; have services accept an already-resolved user where practical.

**Impact:** Medium

---

## P2 — Medium

### [ ] Harden CSP and buyer-IP handling

**Why:** `script-src` includes `'unsafe-inline'`, which negates most XSS protection, and `proxy.ts` trusts the spoofable `x-forwarded-for` header as the Shopify buyer IP (affects markets/pricing).

**Where:** `next.config.ts`, `src/proxy.ts`, `src/shopify/helpers.ts`.

**Change:** Move to a nonce/hash-based `script-src` via `proxy` + `next/script` nonce (or explicitly document the accepted risk). Derive buyer IP from the platform-trusted header only, and document the trust boundary.

**Impact:** Medium

### [ ] Replace the in-memory contact-form rate limiter

**Why:** The limiter is a per-instance `Map`, so on serverless it resets constantly and provides almost no protection; it also silently clears at 10k entries.

**Where:** `src/actions/contactActions.ts`.

**Change:** Use a durable store (Vercel KV/Upstash) or an email API with built-in abuse controls; keep the honeypot.

**Impact:** Medium

### [ ] Add tests for the money paths

**Why:** The 8 test files cover only pure utils (40 tests). Cart mutations, auth actions, wishlist and pagination/filter parsing are untested, so regressions like the null-quantity bug go unnoticed.

**Where:** `src/services/**`, `src/actions/**`, `src/shopify/helpers.ts`, `vitest.config.ts`.

**Change:** Unit-test cart/auth/wishlist services and actions with mocked `storefrontSdk`/`cookies`, plus edge cases for `parseFiltersQuery`, `adjustPaginationVariables` and price formatting.

**Impact:** Medium

### [ ] Simplify the bespoke form-state layer

**Why:** Form actions return Zod field errors twice (spread at top level _and_ nested in `fieldErrors`) plus `customerUserErrors`/`userErrors`, consumed by a custom `useFormStatesEffect` hook. It is consistent but heavier than needed and makes every action signature noisy.

**Where:** `src/types/formActions.ts`, `src/utils/form-actions.ts`, `src/hooks/useFormStatesEffect.ts`, `src/actions/*`.

**Change:** Standardize on a single `{ ok: boolean; errors?: Record<string, string[]>; message?: string }` result and one small hook; delete the redundant spreading and helper layer.

**Impact:** Low

---
