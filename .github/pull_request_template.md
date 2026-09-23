# Pull request

## What changed

-

## Verification

- [ ] `yarn lint`
- [ ] `yarn format:check` (or `prettier --write` on touched files)
- [ ] `yarn typegen && yarn lint-ts`
- [ ] Focused Vitest file: `yarn vitest run <path>`
- [ ] `yarn test:coverage`
- [ ] `yarn lint:css` (if CSS/SCSS touched)

## Agent-config drift

- [ ] No convention changed, or `AGENTS.md` (+ scoped rule if any) updated
      in this PR.
- [ ] No secrets or generated files committed
      (`src/shopify/*/index.ts`, `.next/`, `coverage/`, `.env*.local`).
