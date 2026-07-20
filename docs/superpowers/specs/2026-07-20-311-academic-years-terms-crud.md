# [3.1.1] Academic Years & Terms CRUD — Design Spec

**Phase:** 3 — Admin Portal / Epic 3.1 — Academic Structure
**Entity layer:** L1 (Academic Structure)
**Depends on:** Phase 3a (student/admissions), Layer 1 schema (academic_years, terms exist)
**Roles affected:** admin (primary), super_admin (read-only)

---

## 1. Purpose

School admins need to manage the academic calendar: create academic years, define terms within them, mark which year/term is current, and lock terms whose grades/attendance should no longer be editable.

---

## 1a. Automation Strategy

We strike a balance between convenience and explicit control:

1. **Term auto-generation on year creation:** When creating an academic year, the form offers an "Auto-generate terms" toggle. If enabled (default: on for Ghana calendar schools), it creates 3 terms with sensible default names and dates derived from the year's start/end date. The admin can review and edit before saving, or create terms manually.

2. **One-click activate:** The year creation form has a "Set as current year and activate Term 1" checkbox. If checked, the year is set current and the first term's `isCurrent` is set — all in the same transaction.

3. **Manual control remains primary:** Setting current year/term is always an explicit action. No automatic rollover based on dates — that requires a scheduler (deferred to Phase 7+ when BullMQ is wired for recurring jobs).

4. **Lock is manual:** Admins lock a term after grades are finalized. No automatic locking.

5. **Calendar pattern awareness:** The service layer reads `schools.calendar` to determine default term count and naming. Ghana 3-term calendar uses "First Term", "Second Term", "Third Term". Extensible for other patterns later.

---

## 2. Schema Changes

Only one column added to the existing `terms` table:

**`packages/database/src/schema/schools.ts`:**
- Add `locked` column to `terms`: `boolean('locked').default(false).notNull()`

No structural changes to `academic_years` — it already has `isCurrent`, `startDate`, `endDate`, `name` with the correct unique index.

**Shared types (`packages/shared/src/types/school.ts`):**
- `AcademicYear`: replace `status: Status` with `isCurrent: boolean` to match DB
- `Term`: replace `status: Status` with `isCurrent: boolean`, add `locked: boolean`, change `termNumber` to `string` (matches DB varchar)

---

## 3. Service Layer

**File:** `apps/web/services/academic-structure.ts`

Centralizes all business logic. Every function takes `(db, schoolId, ...)` and returns typed results.

| Function | Validation | Transactional? |
|---|---|---|
| `createAcademicYear` | startDate < endDate, name unique per school | No |
| `updateAcademicYear` | same as create, skip if field unchanged | No |
| `deleteAcademicYear` | Rejected if year has terms | No |
| `setCurrentAcademicYear` | Unsets all years, sets target | Yes |
| `createTerm` | dates within parent year range, no overlap with existing terms in same year, termNumber unique within year | No |
| `updateTerm` | same as create | No |
| `deleteTerm` | Rejected if term has enrollments | No |
| `toggleTermLock` | Toggles locked boolean | No |
| `setCurrentTerm` | Unsets all terms in same year, sets target | Yes |

**Overlap detection:** New term's `[startDate, endDate]` must not intersect any existing term's `[startDate, endDate]` in the same academic year. Uses DB query with `between` conditions.

---

## 4. API Routes

All routes require `admin` role. Tenant resolved from host header. All responses use existing `apiSuccess`/`apiError` envelope.

### `/api/academic-years`

| Method | Query Params | Body | Response |
|---|---|---|---|
| GET | `includeInactive` (boolean) | — | `AcademicYear[]` |
| POST | — | `{ name, startDate, endDate, isCurrent?, autoGenerateTerms?, activateTerm1? }` | `AcademicYear & { terms: Term[] }` |

### `/api/academic-years/[id]`

| Method | Body | Response |
|---|---|---|
| GET | — | `AcademicYear & { terms: Term[] }` |
| PATCH | `{ name?, startDate?, endDate?, isCurrent? }` | `AcademicYear` |
| DELETE | — | `{ deleted: true }` |

### `/api/academic-years/[id]/set-current`

| Method | Body | Response |
|---|---|---|
| POST | — | `AcademicYear` |

### `/api/terms`

| Method | Query Params | Body | Response |
|---|---|---|---|
| GET | `academicYearId` (required) | — | `Term[]` |
| POST | — | `{ academicYearId, termNumber, name, startDate, endDate, isCurrent? }` | `Term` |

### `/api/terms/[id]`

| Method | Body | Response |
|---|---|---|
| GET | — | `Term` |
| PATCH | `{ termNumber?, name?, startDate?, endDate?, isCurrent? }` | `Term` |
| DELETE | — | `{ deleted: true }` |

### `/api/terms/[id]/set-current`

| Method | Body | Response |
|---|---|---|
| POST | — | `Term` |

### `/api/terms/[id]/toggle-lock`

| Method | Body | Response |
|---|---|---|
| POST | — | `Term` (with updated locked) |

---

## 5. UI Page

**Route:** `/admin/academics` (already linked in sidebar)

**Structure:**
1. **Page header** with title and "Add Academic Year" button
2. **Current year banner** showing the active academic year + current term
3. **Academic Year table** (columns: Name, Start, End, Current badge, Actions)
   - Click row → expands/collapses terms section below
   - Actions: Edit, Set Current, Delete (with confirmation)
4. **Terms section** (per selected year):
   - "Add Term" button
   - Term table (Name, Number, Start, End, Current, Locked badge, Actions)
   - Actions: Edit, Set Current, Toggle Lock, Delete (gated)
5. **Create/Edit dialogs** using react-hook-form + zod validation

**UI patterns followed:**
- shadcn/ui Dialog for create/edit forms
- ConfirmDialog for destructive actions
- Badge for Current/Locked status
- Empty state when no years/terms exist
- Skeleton loading states

---

## 6. Seed Data

**`packages/database/src/seed.ts`:**
- Add a 2025/2026 academic year with 3 terms (not current, not locked)
- This gives demo data for multi-year workflows

---

## 7. Tests

**`apps/web/tests/services/academic-structure.test.ts`** — unit tests for:
- Create year with valid/invalid dates
- Create term within year date range / outside range
- Overlapping term detection (rejected)
- Set current year (only one current)
- Set current term (only one current per year)
- Toggle lock
- Delete year with terms (rejected)
- Delete term with enrollments (rejected)

**`apps/web/tests/app/api/academic-years/`** — integration tests for:
- GET list
- POST create (valid + invalid)
- PATCH update
- DELETE gated
- set-current

**`apps/web/tests/app/api/terms/`** — integration tests (same coverage)

---

## 8. Acceptance Criteria (from ROADMAP.md)

- Given a term is marked `locked`, when any user attempts to edit grades/attendance in it, then the write is rejected with a clear error.
  - *Note: the grade/attendance write guard itself is implemented when those entities' write routes are built in Phase 4. This issue implements the lock mechanism (schema + toggle + service function) that those routes will call.*
