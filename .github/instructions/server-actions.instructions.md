---
applyTo: 'src/actions/**,src/services/**,src/lib/server/**'
---

# Server actions & services conventions

- Every file in `src/actions/` starts with `'use server'`.
- Validate all external input with `zod`; bound quantities/limits
  (see `cartActions.ts`: `MAX_QUANTITY = 99`, `MAX_LINES_PER_REQUEST = 50`).
- Rate-limit mutations (`isRateLimited`, `getClientIp` pattern).
- Business logic lives in `src/services/`; actions are thin validated
  wrappers. Never call Shopify directly from components.
- Report failures with `reportError`, return typed `{ data, message }`
  results — never leak tokens or stack traces to the client.
