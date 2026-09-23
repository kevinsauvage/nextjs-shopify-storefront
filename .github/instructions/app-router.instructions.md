---
applyTo: 'src/app/**'
---

# App Router conventions

- Server Components by default. Add `'use client'` only for interactivity
  (state, effects, event handlers).
- Never write cookies during Server Component render — use `src/proxy.ts`,
  route handlers, or server actions (see `AGENTS.md`).
- `next/image` without `priority` except the true above-the-fold hero;
  grids and lists never use `priority`.
- Keep `cacheComponents: true` semantics: no request-specific reads during
  prerender; move session logic to `proxy.ts` or per-request boundaries.
