# [3a.1.2 + 3a.1.3] Admissions Review Queue & Enhanced Applicant Data

**Date:** 2026-07-15
**Phase:** 3a — Admissions & Enrollment
**Issues:** 3a.1.2 (Admissions review queue) + 3a.1.3 (Enhanced applicant data collection)
**Depends on:** 3a.1.1 (complete), Layer 1 Academic Structure (Class schema exists)

---

## Overview

Extend the applicant intake system with an admin-facing review queue and enhanced data collection. Admins can list/filter applicants, view full details with uploaded documents, accept/reject/waitlist with capacity-aware warnings. The application form (3a.1.1) gains additional fields for medical info, emergency contacts, guardian occupation, prior report card upload, siblings, and photo.

---

## Schema Changes

### `applicants` table — New columns (3a.1.3)

| Column                      | Type                     | Notes                                        |
| --------------------------- | ------------------------ | -------------------------------------------- |
| `target_class_id`           | `uuid? → classes.id`     | Set when admin accepts into a specific class |
| `prior_report_card_file_id` | `uuid? → media_files.id` | Report card upload                           |
| `guardian_occupation`       | `varchar(100)?`          |                                              |
| `guardian_employer`         | `varchar(200)?`          |                                              |
| `medical_allergies`         | `text?`                  |                                              |
| `medical_conditions`        | `text?`                  |                                              |
| `medical_medications`       | `text?`                  |                                              |
| `doctor_name`               | `varchar(200)?`          |                                              |
| `doctor_phone`              | `varchar(20)?`           |                                              |
| `emergency_contacts`        | `jsonb?`                 | Array of `{name, phone, relationship}`       |
| `siblings_enrolled`         | `boolean default false`  | Checkbox                                     |
| `sibling_details`           | `text?`                  | Free-text sibling info                       |
| `photo_file_id`             | `uuid? → media_files.id` | Applicant photo upload                       |

### Status transitions remain:

```
submitted → under_review, rejected
under_review → accepted, rejected, waitlisted
waitlisted → accepted, rejected
```

---

## API Endpoints

### Existing — extended

| Method | Path                   | Change                                                    |
| ------ | ---------------------- | --------------------------------------------------------- |
| POST   | `/api/applicants`      | Accept new 3a.1.3 fields in schema                        |
| GET    | `/api/applicants`      | Add `search`, `sort` params; join grade_level for display |
| GET    | `/api/applicants/[id]` | Include joined media file URLs                            |
| PATCH  | `/api/applicants/[id]` | Accept new fields; allow admin to update applicant data   |

### New

| Method | Path                                 | Purpose                                      |
| ------ | ------------------------------------ | -------------------------------------------- |
| POST   | `/api/applicants/[id]/accept`        | Accept with class selection + capacity check |
| GET    | `/api/applicants/stats`              | Counts by status for queue header            |
| POST   | `/api/applicants/[id]/update-fields` | Admin updates applicant data fields          |

### `POST /api/applicants/[id]/accept`

```typescript
// Request body
{
  targetClassId: string;    // selected class
  adminNotes?: string;
  sendEmail: boolean;       // notify guardian
}

// Capacity check logic
const class = db.select().from(classes).where(id = targetClassId);
const acceptedCount = db.select(count).from(applicants)
  .where(targetClassId = targetClassId AND status = 'accepted');
const enrolledCount = 0; // stubbed — enrollment table in 3a.2.1
const available = class.capacity - acceptedCount - enrolledCount;

if (available <= 0 && !override) {
  return apiError(409, "Class at capacity — override required");
}

// On success: update applicant status to 'accepted', set targetClassId
```

### `GET /api/applicants/stats`

```typescript
// Response shape
{
  total: number;
  submitted: number;
  under_review: number;
  accepted: number;
  rejected: number;
  waitlisted: number;
}
```

---

## Admin Pages

### `/admin/applicants` — Review queue list

Layout:

- **Stats bar** at top — cards showing counts per status (clickable filters)
- **Filter row** — status dropdown, grade level dropdown, search input
- **Table** with columns: Name, Grade Level, Status, Date Applied, Guardian, Actions
- **Pagination** at bottom

The existing `GET /api/applicants` already supports `status`, `gradeLevelId`, `page`, `pageSize` params.

### `/admin/applicants/[id]` — Applicant detail

Layout:

- **Back link** to queue
- **Header** — Applicant name + status badge + date
- **Two-column info section:**
  - Left: student info (name, DOB, gender, previous school), guardian info (name, email, phone, address, occupation), medical info (allergies, conditions, medications, doctor)
  - Right: uploads (birth certificate, report card, photo), emergency contacts list, siblings info
- **Admin notes** textarea
- **Action bar** — Accept / Reject / Waitlist buttons (only valid transitions shown)
- **Audit log** timeline showing status changes

---

## UI Components

| Component                 | File                                                      | Responsibility                             |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `applicant-stats-bar`     | `components/admin/applicants/applicant-stats-bar.tsx`     | Count cards by status                      |
| `applicant-table`         | `components/admin/applicants/applicant-table.tsx`         | Filterable/paginated data table            |
| `applicant-detail-info`   | `components/admin/applicants/applicant-detail-info.tsx`   | Info display panel                         |
| `applicant-documents`     | `components/admin/applicants/applicant-documents.tsx`     | Document thumbnails + downloads            |
| `applicant-actions`       | `components/admin/applicants/applicant-actions.tsx`       | Action buttons with transition guard       |
| `accept-applicant-dialog` | `components/admin/applicants/accept-applicant-dialog.tsx` | Class selector + capacity check + override |
| `capacity-warning-dialog` | `components/admin/applicants/capacity-warning-dialog.tsx` | Override confirmation dialog               |
| `applicant-audit-log`     | `components/admin/applicants/applicant-audit-log.tsx`     | Timeline of status changes                 |

---

## Capacity Check Flow

```
Admin clicks "Accept"
  → Dialog opens: "Select target class" (dropdown filtered by grade level)
  → System fetches: class capacity, current accepted count, current enrollment (stub: 0)
  → If available slots > 0: proceed
  → If available slots <= 0: show "Class at capacity" warning with override checkbox
  → Admin confirms → status → 'accepted', target_class_id set, audit log written
  → Optional: confirmation email sent to guardian
```

---

## Data Flow Dependencies

- No new DB tables — all changes are column additions to existing `applicants` table
- Media files for uploads use existing `media_files` table + S3 upload flow (3a.1.1)
- Audit logs use existing `audit_logs` table
- Class data uses existing `classes` table with `capacity` and `gradeLevelId`

---

## Files to Create / Modify

### Modify

- `packages/database/src/schema/applicants.ts` — 3a.1.3 columns + target_class_id
- `apps/web/app/api/applicants/route.ts` — Extended GET filters, POST schema
- `apps/web/app/api/applicants/[id]/route.ts` — Extended PATCH for new fields
- `apps/web/app/(school)/admin/dashboard/page.tsx` — Link to review queue

### Create

- `apps/web/app/api/applicants/stats/route.ts` — Stats endpoint
- `apps/web/app/api/applicants/[id]/accept/route.ts` — Accept with capacity check
- `apps/web/app/(school)/admin/applicants/page.tsx` — Review queue list page
- `apps/web/app/(school)/admin/applicants/[id]/page.tsx` — Detail page
- `apps/web/components/admin/applicants/applicant-stats-bar.tsx`
- `apps/web/components/admin/applicants/applicant-table.tsx`
- `apps/web/components/admin/applicants/applicant-detail-info.tsx`
- `apps/web/components/admin/applicants/applicant-documents.tsx`
- `apps/web/components/admin/applicants/applicant-actions.tsx`
- `apps/web/components/admin/applicants/accept-applicant-dialog.tsx`
- `apps/web/components/admin/applicants/capacity-warning-dialog.tsx`
- `apps/web/components/admin/applicants/applicant-audit-log.tsx`
- `apps/web/components/apply/application-form.tsx` — Extended with 3a.1.3 fields

---

## Acceptance Criteria

### 3a.1.2 — Review queue

1. Given an admin opens `/admin/applicants`, then they see a paginated list of all applicants with status filters and grade level filter.
2. Given an admin clicks an applicant row, then they see a detail view with all applicant data, documents, and audit log.
3. Given a class is at capacity, when an admin tries to accept an applicant into it, then the system warns and requires override confirmation.
4. Given an admin accepts an applicant, then the applicant status changes to `accepted` and an audit log entry is created.

### 3a.1.3 — Enhanced data

1. Given a guardian opens the application form, then they see fields for: prior report card upload, guardian occupation/employer, medical info, emergency contacts (multi-entry), siblings enrolled, and applicant photo.
2. Given a guardian submits the enhanced form, then all new fields are stored on the applicant record.
3. Given an admin views an applicant detail, then they see all enhanced data fields displayed.
