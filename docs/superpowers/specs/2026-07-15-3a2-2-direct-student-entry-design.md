# [3a.2.2] Direct Student Entry — Design

**Date:** 2026-07-15
**Phase:** 3a — Admissions & Enrollment
**Issue:** #51
**Dependency:** [3a.2.1] Accepted → Student conversion (merged PR #121)

---

## 1. Overview

Two entry paths for adding students without going through the applicant pipeline:
1. **Manual single-entry form** — admin fills out a form for one student
2. **Bulk CSV import** — admin uploads a CSV with column mapping and row-level validation

Both paths create the same atomic payload: `Student` + `Enrollment` + `Guardian` + `StudentGuardian` + student login `Profile`.

---

## 2. Manual Single-Entry Form

### Page
- **Route:** `/admin/students/new`
- **Component:** `app/(school)/admin/students/new/page.tsx` (server, fetches classes + grade levels)
- **Form:** `components/admin/students/create-student-form.tsx` (client, react-hook-form + shadcn/ui)
- Uses `Controller` + shadcn/ui Nova primitives (same pattern as application form)

### Fields
| Field | Type | Required |
|---|---|---|
| `firstName` | text | yes |
| `lastName` | text | yes |
| `gender` | select (male/female) | yes |
| `dateOfBirth` | date input | yes |
| `classId` | select (class by grade) | yes |
| `guardianName` | text | yes |
| `guardianPhone` | tel | yes |

### API: `POST /api/students`
- **Auth:** `requireRole('admin')`
- **Tenant:** `resolveTenant(host)` → `schoolId`
- **Validation:** Zod schema matching the field set above
- **Transaction (`db.transaction`):**
  1. Resolve `academicYearId` (current year for school)
  2. Generate student ID via `generateStudentId(db, schoolId)` — `{schoolCode}{year}{NNNN}`
  3. Insert `Student` record
  4. Insert `Enrollment` (studentId, classId, academicYearId, status: `'active'`, enrollmentDate: now)
  5. Insert `Guardian` (schoolId, guardianName parsed into firstName/lastName, phone, isPrimary: true)
  6. Insert `StudentGuardian` link (studentId, guardianId, relationship: `'parent'`, isEmergency: false)
  7. Create/check student login `Profile` (email: auto-generated, role: `'student'`, password: scrypt hash)
  8. Insert `AuditLog` entry
- **Return:** `{ student: { id, studentIdNumber, firstName, lastName }, enrollment: { id }, guardian: { id }, credentials: { student: { email, password } } }`

### Navigation
- After success, show a success dialog with student ID and login credentials (same pattern as accept-convert dialog)
- "View Student" link to `/admin/students/[id]` (student detail — future, stub for now)
- "Add Another" button

---

## 3. Bulk CSV Import

### Page
- **Route:** `/admin/students/import`
- **Component:** `app/(school)/admin/students/import/page.tsx` (server)
- **Stepper UI:** `components/admin/students/student-import-wizard.tsx` (client)
  - Step 1: Upload CSV
  - Step 2: Column mapping
  - Step 3: Validation report
  - Step 4: Import confirmation + results

### Step 1 — Upload CSV
- File input accepting `.csv` only
- Client parses CSV with `papaparse` (or manual split) to extract headers + first 10 rows
- Sends `POST /api/students/import/preview` with the raw CSV text

### API: `POST /api/students/import/preview`
- **Input:** raw CSV text
- **Auth:** `requireRole('admin')`
- **Processing:**
  1. Parse CSV headers
  2. Auto-detect column mapping by comparing headers against known field names (`firstName`, `First Name`, `first_name`, etc.)
  3. Return mapping suggestions + first 10 rows for preview
- **Return:** `{ headers: string[], suggestedMapping: Record<string, string>, sampleRows: Record<string, string>[] }`

### Step 2 — Column Mapping UI
- Show table: CSV header → field selector dropdown
- Auto-select matches, leave unmatched as unassigned (highlighted)
- Admin adjusts mappings, clicks "Validate"

### API: `POST /api/students/import/validate`
- **Input:** raw CSV text + mapping (`Record<columnIndex, fieldName>`)
- **Processing:**
  1. Parse CSV → array of row objects using mapping
  2. Validate each row against the Zod schema
  3. Return per-row results
- **Return:** `{ valid: number, invalid: number, rows: { rowNumber, firstName, error: string | null }[] }`

### Step 3 — Validation Report UI
- Summary bar: X valid, Y invalid
- Table of invalid rows: row #, student name (if parseable), field errors
- Download invalid-rows CSV link
- "Import N Valid Students" button (only if valid > 0)

### API: `POST /api/students/import/execute`
- **Input:** same as validate (CSV text + mapping)
- **Processing:**
  1. Parse and validate all rows again (defensive revalidation)
  2. Group into valid and invalid
  3. Process each valid row in its own `db.transaction()` (one student per transaction)
     - Same atomic creation as manual entry: student → enrollment → guardian → link → profile
     - If a row fails mid-transaction, only that row rolls back, others continue
  4. Collect results: succeeded rows (with student IDs), failed rows (with error messages)
  5. Insert single `AuditLog` for the import batch
- **Return:** `{ imported: number, failed: number, results: { rowNumber, status, studentId?, error? }[] }`

### Step 4 — Results UI
- Success count + failed count
- Table of results
- Download error report CSV
- "Import More" button

### CSV Format (expected columns)
Headers that auto-detect accepts (case-insensitive, supports underscores/spaces):
| Field | Accepted Headers |
|---|---|
| `firstName` | `firstName`, `first_name`, `First Name`, `Given Name` |
| `lastName` | `lastName`, `last_name`, `Last Name`, `Surname`, `Family Name` |
| `gender` | `gender`, `Sex` |
| `dateOfBirth` | `dateOfBirth`, `date_of_birth`, `Date of Birth`, `DOB`, `Birth Date` |
| `classCode` | `classCode`, `class_code`, `Class Code`, `Class`, `class` |
| `guardianName` | `guardianName`, `guardian_name`, `Guardian Name`, `Parent Name`, `Parent/Guardian` |
| `guardianPhone` | `guardianPhone`, `guardian_phone`, `Guardian Phone`, `Parent Phone`, `Phone` |

---

## 4. Data Flow Diagram

```
Manual Form                          CSV Import
    │                                     │
    ▼                                     ▼
POST /api/students              POST /api/students/import/preview
    │                                     │
    │                              Preview + mapping
    │                                     │
    │                             POST /api/students/import/validate
    │                                     │
    │                              Validation report
    │                                     │
    │                             POST /api/students/import/execute
    │                                     │
    └──────────┬──────────────────────────┘
               ▼
      db.transaction() per student:
        ┌─────────────────────┐
        │ 1. generateStudentId│
        │ 2. INSERT student   │
        │ 3. INSERT enrollment│
        │ 4. INSERT guardian  │
        │ 5. INSERT sguardian │
        │ 6. UPSERT profile   │
        │ 7. INSERT audit_log │
        └─────────────────────┘
               │
               ▼
        Return result + credentials
```

---

## 5. Error Handling

| Scenario | HTTP | Behaviour |
|---|---|---|
| Invalid Zod field | 422 | Field-level errors, no DB writes |
| Class not found | 404 | Reject the row (import continues for others) |
| Academic year not found | 500 | Batch fails (platform config error) |
| Duplicate guardian email | 409 | Check existing profile; if exists, link instead of create |
| CSV parse failure | 422 | File-level error, no rows processed |
| DB constraint violation | 409 | Per-row rollback, reported in results |
| Partial batch failure | 200 | Results show per-row success/failure, nothing partially commits per invalid row |

---

## 6. Testing

### Unit
- `generateStudentId` — same-school/year sequential, cross-school reset
- Zod schema validation for CSV rows

### Integration
- `POST /api/students` — creates all records atomically
- `POST /api/students/import/validate` — returns correct valid/invalid counts
- `POST /api/students/import/execute` — AC: 200 rows, 5 invalid → 195 succeed, 5 reported with errors, each invalid row isolated
- Guardian dedup — same guardian email reuses existing record

### E2E (future)
- Manual form submission via Playwright
- CSV upload + mapping + import flow

---

## 7. Files to Create/Modify

### New files
| Path | Purpose |
|---|---|
| `apps/web/app/(school)/admin/students/new/page.tsx` | Manual entry page (server) |
| `apps/web/components/admin/students/create-student-form.tsx` | Manual entry form (client) |
| `apps/web/app/api/students/route.ts` | `POST /api/students` handler |
| `apps/web/app/(school)/admin/students/import/page.tsx` | Import page (server) |
| `apps/web/components/admin/students/student-import-wizard.tsx` | Import stepper (client) |
| `apps/web/app/api/students/import/preview/route.ts` | `POST .../import/preview` |
| `apps/web/app/api/students/import/validate/route.ts` | `POST .../import/validate` |
| `apps/web/app/api/students/import/execute/route.ts` | `POST .../import/execute` |
| `apps/web/tests/app/api/students/direct-entry.test.ts` | Integration tests |
| `apps/web/tests/app/api/students/bulk-import.test.ts` | Bulk import tests |

### Modified files
| Path | Change |
|---|---|
| `packages/database/src/schema/index.ts` | Export `enrollments` (if not already — depends on 3a.2.1 merge) |
| `packages/shared/src/types/student.ts` | Add `Enrollment` interface (if not already — depends on 3a.2.1 merge) |
| `apps/web/components/admin/applicants/accept-applicant-dialog.tsx` | Reuse the credentials display pattern |
