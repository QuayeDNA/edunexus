# [3a.3.1] Transfer / Withdrawal / Re-admission — Design Spec

**Date:** 2026-07-15
**Phase:** 3a — Admissions & Enrollment (Epic 3a.3 — Lifecycle events)
**Issue:** [#52](https://github.com/QuayeDNA/edunexus/issues/52)
**Depends on:** [3a.2.1] Student/Guardian conversion, Layer 1 (Academic structure)

---

## 1. Data Model Changes

### `enrollments` table — new columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `end_date` | `date` | Yes | `null` | Set on withdraw/transfer/graduate |
| `transfer_reason` | `varchar(255)` | Yes | `null` | Admin-provided reason |
| `transfer_school_name` | `varchar(200)` | Yes | `null` | Target school name (free-text; inter-system data migration deferred) |

No new tables. Existing `enrollments.status` (`varchar(20)`, default `'active'`) already supports the new values: `active`, `withdrawn`, `transferred_out`, `graduated`.

### `students.status` — updated on lifecycle events

When an enrollment transitions to `withdrawn`, `transferred_out`, or `graduated`, the student's `students.status` is also updated to match — unless they have other active enrollments.

---

## 2. API Surface (backend-only, no UI)

All endpoints are `admin`/`super_admin` role-gated. No parent/student-facing endpoints in this issue (deferred to #123).

### `POST /api/enrollments/:id/withdraw`

Transition `active` → `withdrawn`.

**Request body:**
```json
{ "reason": "Family relocation" }
```

**Logic:**
- Validate enrollment exists, has `status = active`
- Update `enrollment.status = 'withdrawn'`, set `endDate = today`, `transferReason = reason`
- Update `student.status = 'withdrawn'` if no other active enrollments

**Response:** `{ data: { enrollment: { id, status, endDate, reason } } }`

### `POST /api/enrollments/:id/transfer`

Transition `active` → `transferred_out`.

**Request body:**
```json
{ "reason": "Moved to Accra Academy", "targetSchoolName": "Accra Academy" }
```

**Logic:**
- Same as withdraw, but sets `status = 'transferred_out'` and `transferSchoolName`
- Generates a transfer certificate PDF (jsPDF), stores to S3/MinIO, returns download URL

**Response:** `{ data: { enrollment: { id, status, endDate, reason, transferSchoolName }, transferCertificateUrl: "..." } }`

### `POST /api/enrollments/:id/graduate`

Transition `active` → `graduated`.

**Request body:**
```json
{}
```

**Logic:**
- Same as withdraw, but sets `status = 'graduated'`
- No PDF generated in this issue (future: certificate generation in Epic 3.2)

**Response:** `{ data: { enrollment: { id, status, endDate } } }`

### `POST /api/students/:id/re-admit`

Creates a **new** enrollment for a previously inactive student.

**Request body:**
```json
{ "classId": "uuid", "academicYearId": "uuid" }
```

**Logic:**
- Validate student exists with `status` in `['withdrawn', 'transferred_out']`
- Validate class and academic year exist for this school
- Insert new `Enrollment` with `status = 'active'`, new `classId`, new `academicYearId`
- Update `student.status = 'active'`
- All historical enrollments remain linked to the same `Student` id

**Response:** `{ data: { enrollment: { id, status, classId, academicYearId }, student: { id, status } } }`

### `GET /api/students/inactive` (for re-admission lookup)

**Query params:** `?search=John&status=withdrawn`

**Logic:**
- Return students with `status IN ('withdrawn', 'transferred_out')`
- Optional text search on `firstName`, `lastName`, `studentIdNumber`
- Include most recent enrollment info for context

**Response:** `{ data: { students: [{ id, firstName, lastName, studentIdNumber, lastEnrollment: { class, academicYear, endDate } }] } }`

---

## 3. Transfer Certificate PDF

- Generated with `jsPDF` + `jspdf-autotable`
- Contains: student name, ID, date of birth, last class, reason, target school, date of transfer, school stamp placeholder
- Uploaded to S3/MinIO (same pattern as applicant document upload)
- URL returned in transfer response

---

## 4. Error Handling & Validation

| Scenario | Status | Message |
|---|---|---|
| Enrollment not found | 404 | Enrollment not found |
| Enrollment not active | 422 | Cannot withdraw a non-active enrollment |
| Student not inactive (re-admit) | 422 | Student is already active |
| Class not found (re-admit) | 404 | Class not found |
| Academic year not found (re-admit) | 404 | Academic year not found |
| Missing reason (withdraw/transfer) | 422 | Reason is required |

---

## 5. Future Scope (deferred)

- **[3a.3.2] Parent/student transfer request & approval workflow** — GitHub [#123](https://github.com/QuayeDNA/edunexus/issues/123). Portal-fronted request → admin approval queue → triggers same backend. Depends on Phase 6 (Parent Portal) + Phase 7 (Notifications).
- **Inter-school data migration** — When target school is also in-system, migrate enrollment/academic records instead of generating a PDF. Logged as future Epic.

---

## 6. Testing

- Unit tests for each endpoint (happy path + error cases)
- Idempotency: cannot withdraw an already-withdrawn enrollment
- Re-admission: verify historical enrollments remain after new enrollment created
- PDF generation unit test (verify output contains expected fields)
