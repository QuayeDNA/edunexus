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

- [x] **3.1 — Remove or adopt `EmptyState` component** — Refactored to use `buttonVariants()` + `<Link>` per AGENTS.md convention. Kept as shared component.
- [x] **3.2 — Adopt `tenantQuery` helper** — Evaluated and removed. `packages/database/src/helpers.ts` deleted.
- [x] **3.3 — Adopt `routeHandler` wrapper** — Adopted across all 10 super-admin routes and 4 admin lifecycle routes.

### 4. Pattern Consistency — API Routes

- [x] **4.1 — `handleApiError` adoption** — All enrollment lifecycle routes now use `routeHandler` wrapper + typed error throws.
  - Files: `enrollments/[id]/withdraw/route.ts`, `transfer/route.ts`, `graduate/route.ts`, `students/[id]/re-admit/route.ts`
- [x] **4.2 — Fix `err: any` in catch blocks** — Replaced with `catch (error) { return handleApiError(error) }` across all routes.
- [x] **4.3 — Standardize validation error responses** — All routes use `throw parsed.error` (ZodError) or `throw new ValidationError(...)`. Route handler serialises via `handleApiError`.

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

- [x] **7.1 — Fix `conditions: any[]`** — `students/route.ts` and `students/inactive/route.ts` typed as `(SQL | undefined)[]`.
- [x] **7.2 — Fix `parsed.error.flatten().fieldErrors as any`** — `re-admit/route.ts` now uses `throw parsed.error`.
- [x] **7.3 — Fix `gender: undefined as any`** — Already clean; gender field uses zod enum, not in defaultValues.
- [x] **7.4 — Fix Student import wizard `any` types** — Fixed.
- [x] **7.5 — Remove `err: any` from catch blocks** — Covered in 4.2, all resolved.

### 8. Documentation Audit

- [x] **8.1 — Review `docs/superpowers/plans/`** — Clean. No stale references or TODOs outside active plan.
- [x] **8.2 — Review `docs/superpowers/specs/`** — Clean. No stale references.
- [x] **8.3 — Review ROADMAP.md Phase 3 section** — Clean. Phase 3a items marked complete with PR refs, Phase 3 ready for [3.1.1].

---

## Verification ✅

- [x] `pnpm typecheck` passes across the entire monorepo
- [x] All 164+ tests pass (`pnpm --filter web exec vitest run`)
- [x] No `@edunexus/database/src/schema` imports remain
- [x] No `as any` in production route code (file route exceptions noted in `apps/web/app/api/files/`)
- [x] AGENTS.md updated with clean code conventions

---

## Branch Strategy

- Work directly on `epic-refactor-sprint-1`
- ✅ **Sprint complete** — merge to `preview` when ready
