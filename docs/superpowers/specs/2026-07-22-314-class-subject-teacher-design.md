# [3.1.4] Class-Subject-Teacher Assignment Matrix — Design Spec

**Date:** 2026-07-22
**Branch:** `314-class-subject-teacher-assignment`

## 1. Objective

Matrix UI to bulk-assign teachers to subject-class pairs within a grade level. Atomic batch save with per-row validation errors. Functional frontend (polish deferred).

## 2. Schema

`class_subjects` table already exists with `school_id`, `class_id`, `subject_id`, `teacher_id?`. Only change: add unique constraint on `(class_id, subject_id)`.

## 3. API Contract

**`GET /api/class-subject-teacher?gradeLevelId=X&academicYearId=Y`** — returns `{ classes: Class[], subjects: Subject[], assignments: Assignment[] }`. Flat assignments list; frontend cross-references with classes × subjects to build matrix.

**`PUT /api/class-subject-teacher`** — accepts `{ gradeLevelId, assignments: [{ classId, subjectId, teacherId? }] }`. Server atomically validates teacherIds (must be active, same school) then deletes + inserts in a transaction. Returns `{ saved: number, errors: [{ classId, subjectId, error }] }`. Valid rows save even if some fail.

## 4. Services

Single file: `apps/web/services/class-subject-teacher/class-subject-teacher.ts`.
- `getMatrix(ctx, gradeLevelId, academicYearId)` — joins classes × subjects for grade level, left-joins assignments
- `saveMatrix(ctx, gradeLevelId, assignments[])` — validate → delete → insert → return count + errors

Teacher dropdown data fetched via existing `GET /api/staff?role=teacher`.

## 5. Implementation

**Files:**
- Modify `packages/database/src/schema/class-subjects.ts` — add unique constraint
- Create `apps/web/services/class-subject-teacher/class-subject-teacher.ts`
- Create `apps/web/app/api/class-subject-teacher/route.ts` — wrapped with `routeHandler()`, `requireRole('admin')`, Zod validation
- Create `apps/web/app/(school)/admin/class-subject-teacher/page.tsx` — server component, fetches grade levels
- Create `apps/web/components/admin/class-subject-teacher/matrix-client.tsx` — grade level selector, matrix table, save
- Tests: service unit tests + route integration tests

**Flow:** GradeLevelSelector → MatrixClient → `GET` to load → teacher selects → `PUT` to save → reload on success, highlight errors on partial failure.
