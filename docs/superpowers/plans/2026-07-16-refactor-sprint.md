# Refactor Sprint — Epic Refactor Sprint 1

**Branch:** `epic-refactor-sprint-1`  
**Base:** `preview`  
**Goal:** Code quality checkpoint before starting [3.1.1] Academic Years & Terms CRUD  
**Rationale:** Phase 3a was built fast across multiple branches. This sprint tightens consistency, fixes accumulated technical debt, and aligns the codebase with AGENTS.md conventions before opening Phase 3.

---

## Task List

### 1. Doc Fixes

- [ ] **1.1 — AGENTS.md rewrite** ✅ Done (commit `9794e95`)
- [ ] **1.2 — ROADMAP.md update** ✅ Done — marked all Phase 3a + [3.2.1] as complete with PR refs
- [ ] **1.3 — Refactor plan** ✅ Done (this file)

### 2. Import Fixes (CRITICAL)

- [ ] **2.1 — Fix 10 super-admin route imports** — Change `@edunexus/database/src/schema` → `@edunexus/database` in all files under `apps/web/app/api/super-admin/`
  - Files: `schools/route.ts`, `schools/[id]/route.ts`, `users/route.ts`, `users/[id]/route.ts`, `plans/route.ts`, `plans/[id]/route.ts`, `subscriptions/route.ts`, `subscriptions/[id]/route.ts`, `dashboard/stats/route.ts`, `audit-logs/route.ts`

### 3. Dead Code & Unused Exports

- [ ] **3.1 — Remove or adopt `EmptyState` component** — `apps/web/components/empty-state.tsx` is never imported anywhere. Either integrate it into existing empty states or delete.
- [ ] **3.2 — Adopt `tenantQuery` helper** — `packages/database/src/helpers.ts` exports a `tenantQuery()` that auto-injects `school_id` scoping. Currently zero usage across the app. Evaluate whether to adopt (reduces boilerplate) or delete.
- [ ] **3.3 — Adopt `routeHandler` wrapper** — `apps/web/lib/api/handler.ts` is used in only 1 file. Either adopt across all routes or remove (and document the manual pattern instead).

### 4. Pattern Consistency — API Routes

- [ ] **4.1 — `handleApiError` adoption** — Migrate routes from manual `try/catch` + `apiError()` to `throw AppError` + `handleApiError()` pattern. Start with enrollment lifecycle routes, then generalize.
  - Files: `enrollments/[id]/withdraw/route.ts`, `transfer/route.ts`, `graduate/route.ts`, `students/[id]/re-admit/route.ts`
- [ ] **4.2 — Fix `err: any` in catch blocks** — Replace with `instanceof` checks or typed error handling across all routes.
- [ ] **4.3 — Standardize validation error responses** — Ensure all routes return `{ fieldErrors }` on Zod validation failure.

### 5. Pattern Consistency — Admin Components (TanStack Query)

- [ ] **5.1 — Migrate `student-table.tsx`** — Replace `useState` + `useEffect` + `fetch()` with `useQuery` from `@tanstack/react-query`
- [ ] **5.2 — Migrate `applicant-table.tsx`** — Same migration
- [ ] **5.3 — Migrate `create-student-form.tsx`** mutation to `useMutation`
- [ ] **5.4 — Migrate `accept-applicant-dialog.tsx`** mutation to `useMutation`
- [ ] **5.5 — Migrate `student-lifecycle-actions.tsx`** mutations to `useMutation`
- [ ] **5.6 — Migrate `student-import-wizard.tsx`** to TanStack Query

### 6. UI Consistency

- [ ] **6.1 — Add `items` prop to applicant-table Select** — `apps/web/components/admin/applicants/applicant-table.tsx` line 91. Without it, grade filter shows UUID on selection.
- [ ] **6.2 — Replace custom modals with Nova Dialog** — `student-lifecycle-actions.tsx` TransferDialog and ReadmitDialog use raw `fixed inset-0 z-50` markup. Replace with Nova `<Dialog>` component.
- [ ] **6.3 — Consistency pass on Select `items` prop** — Add `items` prop to all Select components with UUID values, even where `items` is optional (consistency across the codebase).

### 7. TypeScript Tightening

- [ ] **7.1 — Fix `conditions: any[]`** — `students/route.ts` and `students/inactive/route.ts` use `any[]` for Drizzle conditions array. Type as `(SQL | undefined)[]`.
- [ ] **7.2 — Fix `parsed.error.flatten().fieldErrors as any`** — `re-admit/route.ts` line 28.
- [ ] **7.3 — Fix `gender: undefined as any`** — `create-student-form.tsx` default values.
- [ ] **7.4 — Fix Student import wizard `any` types** — `student-import-wizard.tsx` lines 22-23, 89, 91, 191.
- [ ] **7.5 — Remove `err: any` from catch blocks** — Covered in 4.2.

### 8. Documentation Audit

- [ ] **8.1 — Review `docs/superpowers/plans/`** — Ensure all completed plans are accurate; no stale references to old branch names or incomplete status.
- [ ] **8.2 — Review `docs/superpowers/specs/`** — Same audit for design specs.
- [ ] **8.3 — Review ROADMAP.md Phase 3 section** — Confirm it's ready for [3.1.1] work (no stale dependency notes).

---

## Verification

Before marking this sprint complete:

- [ ] `pnpm typecheck` passes across the entire monorepo
- [ ] All 164+ tests pass (`pnpm --filter web exec vitest run`)
- [ ] No `@edunexus/database/src/schema` imports remain (grep check)
- [ ] No `as any` in production route code (test file exemptions are fine)
- [ ] AGENTS.md matches the actual state of the codebase

---

## Branch Strategy

- Work directly on `epic-refactor-sprint-1`
- Commit after each completed task section (not per individual file)
- Final commit before merging: verify + squash if needed
- Merge to `preview` when all verification gates pass
