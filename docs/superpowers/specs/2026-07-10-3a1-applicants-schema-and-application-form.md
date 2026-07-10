# [3a.1.1] Public Application Form — Design

> 2026-07-10

## Scope

Implement the applicant intake pipeline: a new `applicants` table, public submission form at `/apply`, admin review API routes, and email confirmation via existing Resend service. File uploads use Cloudinary unsigned upload (stub — S3 storage comes later).

---

## Schema: `applicants`

New file: `packages/database/src/schema/applicants.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `school_id` | `uuid references schools(id) not null` | Tenant-scoped |
| `first_name` | `varchar(100) not null` | |
| `last_name` | `varchar(100) not null` | |
| `date_of_birth` | `date not null` | |
| `gender` | `varchar(10) not null` | |
| `guardian_name` | `varchar(200) not null` | |
| `guardian_email` | `varchar(255) not null` | Contact for confirmation |
| `guardian_phone` | `varchar(20)` | Optional |
| `guardian_address` | `text` | Optional |
| `grade_level_id` | `uuid references grade_levels(id) not null` | Grade applied for |
| `previous_school` | `varchar(255)` | Optional |
| `document_urls` | `text[]` | Array of Cloudinary URLs |
| `status` | `varchar(20) not null default 'submitted'` | `submitted`, `under_review`, `accepted`, `rejected`, `waitlisted` |
| `admin_notes` | `text` | Internal notes |
| `created_at` | `timestamptz default now() not null` | |
| `updated_at` | `timestamptz default now() not null` | |

Indexes: `(school_id)`, `(status)`, `(school_id, status)`.

Export from `schema/index.ts`.

---

## API Routes

### `POST /api/applicants` — Public submission

- No auth required; reads `school_id` from `x-tenant-id` header (set by proxy)
- Validates body with Zod (all required fields, email format, valid grade level)
- Inserts applicant with `status: 'submitted'`
- Sends confirmation email via `sendEmail()` (Resend) to `guardian_email`
- Returns the created applicant (id + status)
- Error: 422 on validation failure, 500 on send failure (applicant still created)

### `GET /api/applicants` — Admin list

- Auth: `admin` or `super_admin`
- Returns paginated list with optional filters: `status`, `gradeLevelId`
- Ordered by `created_at desc`

### `GET /api/applicants/[id]` — Admin detail

- Auth: `admin` or `super_admin`
- Returns full applicant record

### `PATCH /api/applicants/[id]` — Admin status change

- Auth: `admin` or `super_admin`
- Body: `{ status: 'under_review' | 'accepted' | 'rejected' | 'waitlisted' }`
- Validates status transition (can't go back to `submitted` once moved)
- Updates `updated_at`, saves previous status in audit log

---

## Public Form Page: `/apply`

A Server Component page at `apps/web/app/apply/page.tsx`:

- Reads school-scoped grade levels (from `x-tenant-id` header)
- Renders a client component with form fields matching the schema
- Cloudinary unsigned upload for documents:
  - Configure upload preset in Cloudinary dashboard
  - Env vars: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
  - Upload via `fetch` to Cloudinary API, returns URL(s)
  - Store returned URLs in `document_urls`
- On successful submission: shows confirmation with applicant ID
- On error: shows validation errors inline

---

## Dependencies

None beyond what exists:
- `apps/web/services/email/index.ts` — Resend service (already built, Phase 2)
- `gradeLevels` schema — already seeded with 11 grades (Creche–JHS3)
- `@tanstack/react-query` — already installed (for admin list view later)

New env vars added (optional — form works without them, just no file upload):
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

---

## Acceptance Criteria

Given a valid school subdomain:
1. When a guardian submits the form with all required fields, then an `applicant` row is created with status `submitted`
2. When the form is submitted, then a confirmation email is sent to `guardian_email` within 1 minute (in dev mode, logged to console)
3. When a required field is missing, then the form shows an inline validation error and no row is created
4. When an admin views the applicants list, then only applicants for their school appear (tenant-scoped)
5. When a file is uploaded, then it is stored via Cloudinary and the URL appears in `document_urls`
