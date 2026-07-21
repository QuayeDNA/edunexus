# [3.1.2] Grade Levels & Classes CRUD

**Date:** 2026-07-21
**Epic:** 3.1 — Academic structure (Layer 1)
**Depends on:** [#28](https://github.com/QuayeDNA/edunexus/issues/28) (3.1.1) — schema + academic_years exist
**GitHub Issue:** [#29](https://github.com/QuayeDNA/edunexus/issues/29)

---

## Overview

CRUD for grade levels (KG1–JHS3) and classes within them. Builds on existing `gradeLevels` and `classes` tables seeded in Phase 1. Follows the same architecture as [3.1.1] Academic Years & Terms.

---

## Schema

### Grade Levels (`grade_levels`)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| school_id | uuid | FK → schools, NOT NULL |
| code | varchar(20) | e.g. "P1", "JHS1" |
| name | varchar(100) | e.g. "Primary 1" |
| description | text | NEW — nullable |
| level | integer | Numeric ordering within school system |
| category | varchar(50) | kindergarten, primary, junior_secondary, etc. |
| sort_order | integer | Display ordering |

**Indexes:** school_id, (school_id, sort_order), unique (school_id, code) — NEW unique constraint.

### Classes (`classes`)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_id | uuid | FK → schools |
| name | varchar(100) | e.g. "Class 1A" |
| code | varchar(20) | nullable, e.g. "P1-A" |
| grade_level_id | uuid | FK → grade_levels |
| academic_year_id | uuid | FK → academic_years |
| homeroom_teacher_id | uuid | FK → staff, nullable |
| capacity | integer | nullable |
| room_number | varchar(20) | nullable |

**Indexes:** school_id, grade_level_id, academic_year_id, homeroom_teacher_id, unique (school_id, grade_level_id, name) — NEW composite unique.

---

## Architecture

### Service Layer

Two new service files mirroring `services/academic-structure.ts`:

- `services/grade-levels.ts` — `listGradeLevels`, `getGradeLevel`, `createGradeLevel`, `updateGradeLevel`, `deleteGradeLevel`
- `services/classes.ts` — `listClasses`, `getClass`, `createClass`, `updateClass`, `deleteClass`

#### Grade Level Behaviors
- `listGradeLevels` — select all where `schoolId = ctx.schoolId`, ordered by `sortOrder ASC`
- `createGradeLevel` — validate Zod schema, check unique `(school_id, code)`, insert
- `getGradeLevel` — select by id, include class count
- `updateGradeLevel` — select existing, update fields, skip unique code check if unchanged
- `deleteGradeLevel` — reject if classes reference it (check count > 0), then delete

#### Class Behaviors
- `listClasses` — select by `gradeLevelId` + `schoolId`, ordered by name
- `createClass` — validate Zod schema; validate `gradeLevelId`, `academicYearId`, and `homeroomTeacherId` (if provided) exist; check unique `(school_id, grade_level_id, name)`; insert, return with grade level name
- `getClass` — select by id + schoolId, left join grade level name
- `updateClass` — same validations; skip unique name check if unchanged
- `deleteClass` — soft delete via `deletedAt`

### API Routes

Use existing direct try/catch pattern from [3.1.1]. One route file per entity group:

| File | Methods |
|------|---------|
| `app/api/grade-levels/route.ts` | GET (list), POST (create) |
| `app/api/grade-levels/[id]/route.ts` | GET, PATCH, DELETE |
| `app/api/classes/route.ts` | GET (list by `?gradeLevelId=`), POST |
| `app/api/classes/[id]/route.ts` | GET, PATCH, DELETE |

### UI

Add grade levels / classes to the existing Academics admin page (`components/admin/academics/`):

- **Grade level list** — tab/section below academic years, showing name, code, class count, actions
- **Create grade level dialog** — form: code, name, level, category (select: kindergarten/primary/junior_secondary/senior_secondary), description
- **Edit grade level dialog** — same form, pre-filled
- **Class list per grade level** — expandable section or drill-in showing classes with name, capacity, teacher, actions
- **Create class dialog** — form: name, code (optional), grade level (pre-selected), academic year (select current+available), homeroom teacher (searchable select), capacity, room number
- **Edit class dialog** — same form, pre-filled
- **Delete** — confirmation via AlertDialog, reject if classes exist for grade level

### Tests

- **Service unit tests** — `tests/services/grade-levels.test.ts`, `tests/services/classes.test.ts`
  - Full CRUD happy paths
  - Validation errors (duplicate code/name, bad FKs)
  - Delete rejection when children exist
  - Soft-delete for classes (get returns 404 after delete)
- **API integration tests** — `tests/app/api/grade-levels/route.test.ts`, `tests/app/api/classes/route.test.ts`
  - All endpoints return correct status + shape
  - Auth guards (401/403)

---

## Acceptance Criteria

1. ✅ Grade levels can be created with code, name, level, category, sort_order — duplicate code per school rejected
2. ✅ Grade levels can be listed ordered by sort_order
3. ✅ Grade level detail shows class count
4. ✅ Deleting a grade level with existing classes is rejected with conflict error
5. ✅ Classes can be created within a grade level — duplicate name per grade level rejected
6. ✅ Classes can be listed filtered by grade level
7. ✅ Class detail shows grade level name
8. ✅ Classes can be updated (name, capacity, teacher, room)
9. ✅ Classes can be soft-deleted
10. ✅ Invalid grade/academic year/teacher FKs return 404/400
11. ✅ Auth guards on all endpoints
