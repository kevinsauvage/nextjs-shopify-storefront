---
applyTo: 'src/**/*.test.ts'
---

# Testing conventions

- Vitest, node env, `server-only` aliased to no-op. Colocated
  `*.test.ts` next to the unit under test.
- Add/extend tests for every change in `src/actions/`, `src/services/`,
  `src/lib/`, `src/shopify/helpers.ts`.
- `src/app/**` and `src/components/**` are covered by typecheck + build,
  not unit coverage — do not add tests there to game coverage.
- Floors (`vitest.config.ts`): branches 74, functions 68,
  lines/statements 35. Never lower thresholds to make CI pass.
- Reproduce bugs with the smallest focused test first; run
  `yarn vitest run <path>` before `yarn test:coverage`.
