# [3.2.1] Student List / Detail / Edit — Design Spec

**Phase:** 3 — Admin Portal
**Entity Layer:** L2 (People & Admissions)
**Depends on:** [3a.2.2] Direct student entry, [3a.3.1] Lifecycle API endpoints (no UI dependency — lifecycle actions deferred)
**Roles affected:** admin, super_admin

---

## 1. Overview

Build the student management module for the admin portal: a list page with search/filter/pagination/stats, a detail page showing profile/enrollments/guardians, and an edit page for updating student profile fields. Lifecycle actions (withdraw, transfer, graduate, re-admit) are deferred to a separate issue — only lifecycle _display_ (enrollment status badges, enrollment history) is in scope.

---

## 2. API Layer

### 2.1 `GET /api/students` — List students

**Query params:** `search`, `classId`, `status`, `gradeLevelId`, `page`, `pageSize`

**Response envelope:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "otherNames": "string | null",
      "studentIdNumber": "string",
      "gender": "string",
      "status": "active | withdrawn | transferred_out | graduated",
      "className": "string",
      "gradeLevelName": "string",
      "guardianName": "string | null",
      "enrollmentDate": "date string"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 150, "totalPages": 8 }
}
```

- `guardianName` is the primary guardian's full name (LEFT JOIN through `studentGuardians` → `guardians`, pick `isPrimary = true` or first).
- `className` via JOIN on `enrollments` → `classes` (current active enrollment only, or latest).
- Search matches `firstName`, `lastName`, `studentIdNumber` via `ILIKE`.
- All queries scoped by `school_id` from `x-tenant-id` header.

### 2.2 `GET /api/students/stats` — Aggregated stats

**Response:**

```json
{
  "total": 150,
  "activeCount": 142,
  "byClass": [{ "className": "JHS 1A", "count": 30 }, ...],
  "byStatus": [{ "status": "active", "count": 142 }, ...]
}
```

- `byClass` returns classes with at least one enrollment in the current academic year, sorted by count descending, max 8 with overflow indicator.
- School-scoped.

### 2.3 `GET /api/students/[id]` — Student detail

**Response:**

```json
{
  "id": "uuid",
  "schoolId": "uuid",
  "studentIdNumber": "string",
  "firstName": "string",
  "lastName": "string",
  "otherNames": "string | null",
  "gender": "string",
  "dateOfBirth": "date string",
  "placeOfBirth": "string | null",
  "nationality": "string",
  "religion": "string | null",
  "address": "string | null",
  "phone": "string | null",
  "email": "string | null",
  "bloodGroup": "string | null",
  "medicalNotes": "string | null",
  "status": "string",
  "enrollmentDate": "date string",
  "enrollments": [
    {
      "id": "uuid",
      "className": "string",
      "academicYearName": "string",
      "status": "string",
      "enrollmentDate": "date string",
      "endDate": "date string | null"
    }
  ],
  "guardians": [
    {
      "id": "uuid",
      "firstName": "string",
      "lastName": "string",
      "relationship": "string",
      "phone": "string | null",
      "email": "string | null",
      "occupation": "string | null",
      "isPrimary": "boolean"
    }
  ]
}
```

- All data fetched server-side in a single handler, joins for enrollments and guardians.
- Returns 404 if student not found or belongs to different school.

### 2.4 `PATCH /api/students/[id]` — Update student profile

**Request body** (zod-validated):

```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "otherNames": "string | null (optional)",
  "gender": "string (optional)",
  "dateOfBirth": "date string (optional)",
  "placeOfBirth": "string | null (optional)",
  "nationality": "string (optional)",
  "religion": "string | null (optional)",
  "address": "string | null (optional)",
  "phone": "string | null (optional)",
  "email": "string | null (optional)",
  "bloodGroup": "string | null (optional)",
  "medicalNotes": "string | null (optional)"
}
```

- Only updates profile fields — **no enrollment/class changes** (those are lifecycle operations).
- Scoped to school. Returns 404 if wrong school.
- Returns updated student on success.

---

## 3. UI Pages

### 3.1 List Page — `/admin/students`

**Server component** pattern (matching applicants page):

1. `requireRole('admin', 'super_admin')`
2. Fetch reference data (classes, grade levels) from DB for dropdown filters
3. Render `<StudentTable>` client component with `classes`, `gradeLevels` as props

**`<StudentTable>`** client component state (useState):

- `students: StudentRow[]`
- `stats: { total, activeCount, byClass, byStatus } | null`
- `loading: boolean`
- `search: string`
- `classId: string`
- `status: string`
- `gradeLevelId: string`
- `page: number`
- `total: number`
- `totalPages: number`

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ <PageHeader title="Students" description="...">      │
│   <Button asChild><Link to="./new">+ Add Student</Link>│
│ </PageHeader>                                        │
├─────────────────────────────────────────────────────┤
│ <StudentStatsBar> — clickable StatCards               │
│   Row 1: [Total: 150] [Active: 142] [Withdrawn: 5]  │
│          [Transferred: 3]                            │
│   Row 2: Classes: [JHS 1A: 30] [JHS 1B: 28]         │
│          [JHS 2A: 25] [+3 more]                     │
├─────────────────────────────────────────────────────┤
│ Filter bar:                                          │
│   <Select> Class (placeholder: "All Classes") </Select>│
│   <Select> Status (placeholder: "All Statuses") </Select>│
│   <Select> Grade Level </Select>                      │
│   <Input> Search by name or ID </Input>              │
│   <Button variant="outline" size="icon">↻</Button>   │
├─────────────────────────────────────────────────────┤
│ <StudentTable> — manual <table>                       │
│   #  | Student     | ID        | Class  | Status |  │
│      | Name +      | SCH...    | JHS 1A | Active |  │
│      | Guardian    |           |        | [Badge]|  │
│      |             |           |        | [View] |  │
├─────────────────────────────────────────────────────┤
│ Pagination: "N total" | [Prev] [1] [2] [3] ... [Next] │
└─────────────────────────────────────────────────────┘
```

**Interaction:**

- Clicking a stat card filters by that status (sets `status` state, resets `page` to 1, re-fetches).
- Select/Input changes trigger debounced re-fetch (300ms for search, immediate for selects).
- `useEffect` watches filter states and calls `fetch('/api/students?...')`.
- `fetchStats()` runs once on mount for stats bar.

### 3.2 Detail Page — `/admin/students/[id]`

**Server component** pattern (matching applicant detail):

1. `requireRole('admin', 'super_admin')`
2. Fetch student via `GET /api/students/[id]` (or direct DB query)
3. Not found → `notFound()`
4. Render client sub-components with serialized data

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Students  (Link to /admin/students)       │
│ [Full Name]  [Badge: Active]                        │
│ ID: SCH20260001 · Enrolled January 2026             │
│ [Edit Profile] → /admin/students/[id]/edit          │
├─────────────────────────────────────────────────────┤
│ Two-column grid:                                    │
│ ┌──────────────────┐ ┌──────────────────┐           │
│ │ Personal Info    │ │ Contact Info     │           │
│ │ DOB, Gender,     │ │ Phone, Email,    │           │
│ │ Nationality,     │ │ Address,         │           │
│ │ Religion,        │ │ Place of Birth   │           │
│ │ Blood Group      │ └──────────────────┘           │
│ ├──────────────────┤                                │
│ │ Medical Notes    │                                │
│ └──────────────────┘                                │
├─────────────────────────────────────────────────────┤
│ <StudentGuardians> — card list                       │
│   ┌────────────────────────────────────────────┐    │
│   │ Name (Relationship) · Phone · Email        │    │
│   │   Primary contact                          │    │
│   └────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│ <StudentEnrollments> — table                         │
│   Academic Year  |  Class  |  Status  |  Period     │
│   2025/2026      | JHS 1A  | Active   | Sep-Present │
│   2024/2025      | JHS 1   | Graduated| Sep-Aug     │
├─────────────────────────────────────────────────────┤
│ <StudentAuditLog> — activity history                  │
│   ● Profile updated by Jane Admin (Jul 16, 2026)    │
│   ● Student created via conversion (Jan 15, 2026)   │
└─────────────────────────────────────────────────────┘
```

### 3.3 Edit Page — `/admin/students/[id]/edit`

**Server component:**

1. `requireRole('admin', 'super_admin')`
2. Fetch student data from DB
3. Not found → `notFound()`
4. Render `<EditStudentForm student={...} />`

**`<EditStudentForm>`** — client component using `react-hook-form` + `zodResolver`:

- Fields: firstName, lastName, otherNames, gender (select), dateOfBirth (date), placeOfBirth, nationality, religion, address (textarea), phone, email, bloodGroup (select), medicalNotes (textarea)
- Pre-filled from student prop
- On submit: `PATCH /api/students/[id]`
- On success: `router.push('/admin/students/[id]')` with success toast
- On error: show field-level validation errors or general error toast
- Cancel button: `router.back()`

---

## 4. Navigation Change

**File:** `apps/web/components/layouts/admin-sidebar.tsx`

Change Students nav item from:

```tsx
{ href: '/admin/students/new', label: 'Students', icon: Users },
```

To:

```tsx
{ href: '/admin/students', label: 'Students', icon: Users },
```

The `/admin/students/new` and `/admin/students/import` routes remain accessible as sub-routes.

---

## 5. Component Tree

```
apps/web/app/(school)/admin/students/
  page.tsx                          ← Server: list page (fetches classes/gradeLevels → renders StudentTable)
  [id]/
    page.tsx                        ← Server: detail page (fetches student → renders sub-components)
    edit/
      page.tsx                      ← Server: edit page (fetches student → renders EditStudentForm)

apps/web/components/admin/students/
  student-table.tsx                 ← Client: table + filter bar + pagination + stats
  student-stats-bar.tsx             ← Client: stat cards (extracted for cleanliness, used by student-table)
  student-detail-info.tsx           ← Client: info panels (personal, contact, medical)
  student-guardians.tsx             ← Client: guardian card list
  student-enrollments.tsx           ← Client: enrollment history table
  edit-student-form.tsx             ← Client: react-hook-form edit form
  student-audit-log.tsx             ← Client: audit log entries (reuses pattern from applicant-audit-log)
```

---

## 6. Testing

| Test file                               | Coverage                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `tests/app/api/students/list.test.ts`   | GET /api/students — search, filter by class/status, pagination, stats endpoint, tenant isolation |
| `tests/app/api/students/detail.test.ts` | GET /api/students/:id — returns full detail, 404 for wrong school, 404 for non-existent          |
| `tests/app/api/students/update.test.ts` | PATCH /api/students/:id — partial update, full update, validation, 404 for wrong school          |

All tests follow existing patterns (`vi.mock` for `next/headers`, `requireRole`, etc.)

---

## 7. Out of Scope

- Lifecycle action UI (withdraw, transfer, graduate, re-admit) — deferred to separate issue
- Bulk promotion workflow — [3.2.2]
- ID card generation — [3.2.3]
- Guardian CRUD (add/edit/remove guardians from student detail) — deferred
- TanStack Query integration — Phase 8 concern
