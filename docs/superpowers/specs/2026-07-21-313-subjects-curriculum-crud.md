# [3.1.3] Subjects & Curriculum CRUD

**Date:** 2026-07-21
**Epic:** 3.1 — Academic structure (Layer 1)
**Depends on:** [#29](https://github.com/QuayeDNA/edunexus/issues/29) (3.1.2) — grade_levels exist
**GitHub Issue:** [#30](https://github.com/QuayeDNA/edunexus/issues/30)

---

## Overview

CRUD for subjects, subject-to-grade-level mapping (core/elective), and curriculum groupings. Follows same embedded-section architecture as [3.1.2] — subjects, mappings, and curricula are new sections within the existing Academics admin page.

Data feeds into [3.1.4] Class-Subject-Teacher assignment matrix and [4.3] Assessment & grade entry.

---

## Schema

### Modified: `subjects` (table exists, add `description`)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| school_id | uuid | FK → schools, NOT NULL |
| code | varchar(20) | e.g. "MATH", "ENG" |
| name | varchar(100) | e.g. "Mathematics" |
| category | varchar(50) | nullable, existing field |
| description | text | NEW — nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Indexes:** `idx_subjects_school_id` (school_id), `idx_subjects_code` (school_id, code) — existing.

### New: `subject_grade_levels`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_id | uuid | FK → schools, NOT NULL |
| subject_id | uuid | FK → subjects, NOT NULL |
| grade_level_id | uuid | FK → grade_levels, NOT NULL |
| is_core | boolean | default true — core vs elective |
| sort_order | integer | display ordering within grade level |

**Indexes:** (school_id), (grade_level_id), unique (school_id, subject_id, grade_level_id).

### New: `curricula`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_id | uuid | FK → schools, NOT NULL |
| code | varchar(20) | e.g. "SCI", "BUS" |
| name | varchar(100) | e.g. "General Science" |
| description | text | nullable |

**Indexes:** (school_id), unique (school_id, code).

### New: `curriculum_subjects`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_id | uuid | FK → schools, NOT NULL |
| curriculum_id | uuid | FK → curricula, NOT NULL |
| subject_id | uuid | FK → subjects, NOT NULL |

**Indexes:** (school_id), (curriculum_id), unique (school_id, curriculum_id, subject_id).

---

## Architecture

### Service Layer

Each service file exports Zod schemas, CRUD functions, and uses `ServiceContext { db; schoolId }`.

#### `services/subjects.ts`

- `listSubjects(ctx, gradeLevelId?)` — all subjects for school. If `gradeLevelId` provided, left join `subject_grade_levels` to expose mapping status.
- `getSubject(ctx, id)` — single subject.
- `createSubject(ctx, data)` — Zod validate, check unique `(school_id, code)`, insert.
- `updateSubject(ctx, id, data)` — check existence, skip unique code check if unchanged, update.
- `deleteSubject(ctx, id)` — reject if referenced in `class_subjects` or `subject_grade_levels` (conflict error), then delete.

**Zod schemas:**
```ts
export const createSubjectSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export const updateSubjectSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});
```

#### `services/subject-grade-levels.ts`

- `listGradeLevelSubjects(ctx, gradeLevelId)` — subjects mapped to a grade level, with `isCore` flag.
- `setGradeLevelSubjects(ctx, gradeLevelId, subjectIds[], defaultCore = true)` — bulk replace: delete any existing mappings for this grade level; insert new mappings for each subject ID. Runs in a transaction.
- `toggleCore(ctx, id)` — flip `is_core` on a single mapping.

**Zod schemas:**
```ts
export const setGradeLevelSubjectsSchema = z.object({
  subjectIds: z.array(z.string().uuid()).min(1, 'At least one subject required'),
  defaultCore: z.boolean().optional().default(true),
});
```

#### `services/curricula.ts`

- `listCurricula(ctx)` — all curricula for school, with subject count.
- `getCurriculum(ctx, id)` — single curriculum with its subjects.
- `createCurriculum(ctx, data)` — validate unique `(school_id, code)`.
- `updateCurriculum(ctx, id, data)` — same uniqueness check on code.
- `deleteCurriculum(ctx, id)` — reject if curriculum has subjects assigned (conflict error).
- `setCurriculumSubjects(ctx, curriculumId, subjectIds[])` — bulk replace subjects.

**Zod schemas:**
```ts
export const createCurriculumSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateCurriculumSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const setCurriculumSubjectsSchema = z.object({
  subjectIds: z.array(z.string().uuid()).min(1),
});
```

### API Routes

Use `routeHandler()` wrapper from `@/lib/api/handler`. Throw typed errors on failure (`NotFoundError`, `ConflictError`, `ValidationError`). Throw Zod errors via `throw parsed.error`. Auth guard via `requireRole()` with early return.

| File | Methods |
|------|---------|
| `app/api/subjects/route.ts` | GET (list, optional `?gradeLevelId=` filter), POST |
| `app/api/subjects/[id]/route.ts` | GET, PATCH, DELETE |
| `app/api/subject-grade-levels/route.ts` | GET (`?gradeLevelId=`), POST (bulk set) |
| `app/api/subject-grade-levels/[id]/toggle-core/route.ts` | POST |
| `app/api/curricula/route.ts` | GET, POST |
| `app/api/curricula/[id]/route.ts` | GET, PATCH, DELETE |
| `app/api/curricula/[id]/subjects/route.ts` | POST (bulk assign) |

**Auth:** Mutations → `requireRole('admin')`. Reads → `requireRole('admin', 'super_admin')`.

### UI

New components in `apps/web/components/admin/academics/`:

#### Subjects Section
- `subjects-section.tsx` — section with "Subjects" heading, list of subjects (code badge, name, description preview), edit/delete per row, empty state when none.
- `create-subject-dialog.tsx` — Nova Dialog with Controller: code (Input), name (Input), category (Select with items), description (Textarea).
- `edit-subject-dialog.tsx` — same form pre-filled, PATCH on submit.

#### Subject-to-Grade-Level Mapping
- Inside each grade level's expandable card (alongside the existing "Classes" area), add a "Subjects" area after classes.
- Shows a multiselect or checkbox list of all subjects; each with a core/elective toggle.
- Uses `setGradeLevelSubjects` for bulk save.

#### Curricula Section
- `curricula-section.tsx` — expandable section at bottom of academics page (after grade levels section), lists curricula with subject count, edit/delete.
- `create-curriculum-dialog.tsx` — code, name, description, optional subject assignment multiselect.
- `edit-curriculum-dialog.tsx` — same pre-filled + current subjects shown.

#### Wiring
- Modify `academics-client.tsx` to import and render `<SubjectsSection />` and `<CurriculaSection />` below `<GradeLevelsSection />`.

### Tests

#### Service Unit Tests
- `tests/services/subjects.test.ts` — CRUD happy paths, duplicate code rejection, delete rejection when referenced.
- `tests/services/subject-grade-levels.test.ts` — bulk set replaces correctly, toggleCore flips flag.
- `tests/services/curricula.test.ts` — CRUD, bulk subject assignment, delete rejection when subjects exist.

#### API Integration Tests
- `tests/app/api/subjects/route.test.ts` — all endpoints return correct shape, auth guards, validation errors.
- `tests/app/api/subject-grade-levels/route.test.ts` — bulk set, toggle.
- `tests/app/api/curricula/route.test.ts` — CRUD, subject assignment.

### Seed

Update `packages/database/src/seed.ts` to add subjects for the demo school:
- Core primary subjects: Mathematics, English, Science, Ghanaian Language, BDT, ICT, Creative Arts, RME, History, French
- Grade-level mappings for existing grade levels (KG1–JHS3)
- At least one curriculum grouping (e.g., "Core Subjects")

---

## Acceptance Criteria

1. ✅ Subjects can be created with code, name, description — duplicate code per school rejected
2. ✅ Subjects can be listed with optional grade-level filter
3. ✅ Subjects can be updated and deleted (delete rejected if referenced by class_subjects or subject_grade_levels)
4. ✅ Subjects can be mapped to grade levels in bulk — old mappings for a grade level are replaced atomically
5. ✅ Subject-to-grade-level mapping has core/elective toggle per subject
6. ✅ Curricula can be created with code, name, description — unique code per school
7. ✅ Curricula can list subjects assigned to them
8. ✅ Subjects can be bulk-assigned to a curriculum
9. ✅ Deleting a curriculum with subjects assigned is rejected with a conflict error
10. ✅ Auth guards on all mutation endpoints
11. ✅ Seed data includes subjects, grade-level mappings, and at least one curriculum for the demo school

---

## File Structure

```
Create:  packages/database/src/schema/subject-grade-levels.ts
Create:  packages/database/src/schema/curricula.ts
Create:  packages/database/src/schema/curriculum-subjects.ts
Modify:  packages/database/src/schema/index.ts
Modify:  packages/database/src/schema/subjects.ts              — add description column
Modify:  packages/shared/src/types/academics.ts                — align types
Create:  apps/web/services/subjects.ts
Create:  apps/web/services/subject-grade-levels.ts
Create:  apps/web/services/curricula.ts
Create:  apps/web/app/api/subjects/route.ts
Create:  apps/web/app/api/subjects/[id]/route.ts
Create:  apps/web/app/api/subject-grade-levels/route.ts
Create:  apps/web/app/api/subject-grade-levels/[id]/toggle-core/route.ts
Create:  apps/web/app/api/curricula/route.ts
Create:  apps/web/app/api/curricula/[id]/route.ts
Create:  apps/web/app/api/curricula/[id]/subjects/route.ts
Create:  apps/web/components/admin/academics/subjects-section.tsx
Create:  apps/web/components/admin/academics/create-subject-dialog.tsx
Create:  apps/web/components/admin/academics/edit-subject-dialog.tsx
Create:  apps/web/components/admin/academics/curricula-section.tsx
Create:  apps/web/components/admin/academics/create-curriculum-dialog.tsx
Create:  apps/web/components/admin/academics/edit-curriculum-dialog.tsx
Modify:  apps/web/components/admin/academics/academics-client.tsx  — wire in new sections
Create:  apps/web/tests/services/subjects.test.ts
Create:  apps/web/tests/services/subject-grade-levels.test.ts
Create:  apps/web/tests/services/curricula.test.ts
Create:  apps/web/tests/app/api/subjects/route.test.ts
Create:  apps/web/tests/app/api/subject-grade-levels/route.test.ts
Create:  apps/web/tests/app/api/curricula/route.test.ts
Modify:  packages/database/src/seed.ts
```
