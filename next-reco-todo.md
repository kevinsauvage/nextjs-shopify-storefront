# next-reco-todo.md

## 1. Caching & revalidation

- [ ] **P2 — `revalidateTag` signature.** When introduced, the single-arg form is deprecated in 16 —
      always `revalidateTag(tag, 'max')` (or `{ expire: 0 }`). Doc: `revalidateTag.md`.

- [ ] **P2 — Use `after()` for post-response work.** Error reporting / analytics currently run inline
      (`src/lib/server/error-reporter.ts`, `src/instrumentation.ts`). `after()` from `next/server`
      schedules work without making the route dynamic. Doc: `04-functions/after.md`.

- [ ] **P2 — `refresh()` vs `revalidatePath`.** For cart badge/header counts, prefer `refresh()`
      inside the action. Doc: `04-functions/refresh.md`.

## 2. Error handling

- [ ] **P2 — Add `app/global-not-found.tsx`.** `not-found.tsx` exists at the root, but the
      production checklist calls for a global fallback for URLs matching no route at all.
      (Experimental; bypasses the layout, so re-import global styles/theme.) Doc:
      `03-file-conventions/not-found.md` → _`global-not-found.js`_,
      `production-checklist.md:87`.

- [ ] **P2 — Consider `catchError` for component-level recovery.** Doc:
      `04-functions/catchError.md`. ✅ Current `global-error.tsx` correctly renders its own
      `<html>`/`<body>`.

## 5. Fonts, CSS, metadata, routing

- [ ] **P2 — Enable `typedRoutes`.** Stable and no longer under `experimental`. Gives type-checked
      `href`s and pairs with the existing `next typegen` script. Doc:
      `05-config/01-next-config-js/typedRoutes.md`.

- [ ] **P2 — Consider `<Form action="/search">` for the search bar.** `next/form` gives GET
      navigation + prefetch without a server action. `src/components/SearchForm.tsx:35` currently
      wires `useActionState` manually. Doc: `02-components/form.md`. (Auth forms already use
      `next/form` ✅.)

## 6. Client/server boundary, forms, production readiness

- [ ] **P2 — Use `useOptimistic` for wishlist/cart toggles.** Docs recommend optimistic UI for
      mutations (`forms.md:386`); the current rollback logic also has a concurrency bug
      (`todo.md` #4).
