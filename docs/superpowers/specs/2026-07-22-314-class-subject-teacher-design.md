# [3.1.4] Class-Subject-Teacher Assignment Matrix — Design Spec

**Date:** 2026-07-22
**Status:** Draft
**Branch:** `314-class-subject-teacher-assignment`

---

## 1. Objective

Provide admins with a matrix UI to bulk-assign teachers to subject-class pairs within a grade level. Backend handles atomic batch save with per-row validation errors. Frontend is functional (not polished — UI refinement deferred).

---

## 2. Schema

The `class_subjects` pivot table already exists:

| Column      | Type      | Notes                         |
|-------------|-----------|-------------------------------|
| id          | uuid      | PK                            |
| school_id   | uuid      | FK → schools                  |
| class_id    | uuid      | FK → classes                  |
| subject_id  | uuid      | FK → subjects                 |
| teacher_id  | uuid?     | FK → staff (nullable)         |
| created_at  | timestamptz |                              |
| updated_at  | timestamptz |                              |

### Changes needed

1. **Add unique constraint** `(class_id, subject_id)` to prevent duplicate entries.
2. No other schema changes — all columns already present.

---

## 3. API Contract

### `GET /api/class-subject-teacher?gradeLevelId=X&academicYearId=Y`

Returns the full matrix for a grade level:

```json
{
  "classes": [
    { "id": "uuid", "name": "Class 1A", "code": "P1-A" }
  ],
  "subjects": [
    { "id": "uuid", "name": "Mathematics", "code": "MATH", "isCore": true }
  ],
  "assignments": [
    { "classId": "uuid", "subjectId": "uuid", "teacherId": "uuid | null" }
  ]
}
```

`assignments` is a flat list. Frontend hydrates the matrix by cross-referencing `classes × subjects` with `assignments`.

### `PUT /api/class-subject-teacher`

Accepts a full replacement for a grade level:

```json
{
  "gradeLevelId": "uuid",
  "assignments": [
    { "classId": "uuid", "subjectId": "uuid", "teacherId": "uuid | null" }
  ]
}
```

**Logic (server-side, transactional):**
1. Validate every `teacherId` — must reference an existing active staff member in the same school.
2. Delete all `class_subjects` rows for classes belonging to that grade level.
3. Insert all valid rows.
4. Return `{ saved: number, errors: [{ classId, subjectId, error: string }] }`.

If all rows are valid, `errors` is empty. If some fail, the valid ones still save (matching AC: "18 pairs saved, 2 reported").

---

## 4. Service Layer

New directory: `apps/web/services/class-subject-teacher/`

### `class-subject-teacher.ts`

| Function | Input | Output |
|----------|-------|--------|
| `getMatrix(ctx, gradeLevelId, academicYearId)` | ServiceContext + filters | `{ classes, subjects, assignments }` |
| `saveMatrix(ctx, gradeLevelId, assignments[])` | ServiceContext + data | `{ saved: number, errors: ErrorRow[] }` |

Internal helpers:
- `validateTeacher(ctx, teacherId)` — checks staff exists, is active, same school
- Re-use existing service patterns from `staff/staff.ts` and `subjects.ts`

### Staff filter for teacher dropdown

`GET /api/staff?role=teacher` already exists (from [3.3.1]) — frontend uses this to populate teacher dropdowns.

---

## 5. Route Handler

New file: `apps/web/app/api/class-subject-teacher/route.ts`

- Wrapped with `routeHandler()` from `@/lib/api/handler`
- Auth: `requireRole('admin')` for both GET and PUT
- Zod schema for PUT body validation (gradeLevelId required, assignments array, each entry has classId + subjectId + optional teacherId)

---

## 6. Data Flow (Frontend→Backend)

```
Page load:
  Server Component
    → requireRole('admin', 'super_admin')
    → fetch grade levels for the school (from DB directly)
    → render GradeLevelSelector + MatrixClient

User picks a grade level:
  MatrixClient
    → GET /api/class-subject-teacher?gradeLevelId=X&academicYearId=Y
    → build local matrix state (Map<classId×subjectId, teacherId>)
    → render table: rows=classes, cols=subjects, cells=<select teacher>

User picks teachers, hits "Save":
  MatrixClient
    → serialize state to assignments[]
    → PUT /api/class-subject-teacher
    → on success: reload matrix
    → on partial errors: highlight offending cells with error text
```

---

## 7. File Structure

```
Modify:  packages/database/src/schema/class-subjects.ts     — add unique constraint
Create:  apps/web/services/class-subject-teacher/class-subject-teacher.ts
Create:  apps/web/app/api/class-subject-teacher/route.ts
Create:  apps/web/app/(school)/admin/class-subject-teacher/page.tsx
Create:  apps/web/components/admin/class-subject-teacher/matrix-client.tsx
Create:  apps/web/tests/services/class-subject-teacher/class-subject-teacher.test.ts
Create:  apps/web/tests/app/api/class-subject-teacher/route.test.ts
```

---

## 8. Error Handling & Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Invalid teacherId | Row skipped, returned in `errors[]` with message |
| Duplicate classId+subjectId | Unique constraint prevents — handled by insert conflict |
| Deleted/archived class | No subjects will show for it (grade level filter handles this) |
| Empty assignments array | All existing rows for that grade level are deleted (clean slate) |
| Teacher from wrong school | `validateTeacher()` checks schoolId match |
| Network failure mid-save | Transaction rolls back — no partial state |

---

## 9. Testing

| Test scope | What |
|------------|------|
| Service: getMatrix | Returns correct structure for valid grade level |
| Service: saveMatrix | Atomically replaces, returns correct saved count |
| Service: saveMatrix | Partial error reporting for invalid teacherId |
| Route: GET | 401 without auth, 200 with valid params |
| Route: PUT | 422 for invalid body shape, 200 with valid data |
