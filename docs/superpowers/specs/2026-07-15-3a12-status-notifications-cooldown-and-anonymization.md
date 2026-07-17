# Status Notifications, Re-application Cooldown & Data Anonymization

**Phase:** 3a — Admissions & Enrollment (follow-up to 3a.1.2/3a.1.3)
**Date:** 2026-07-15
**Status:** Draft

## Problem

Three gaps exist in the current admissions workflow:

1. **No email notifications on status changes** — Only the initial submission confirmation is sent. Guardians don't learn about rejections, acceptances, or waitlist updates via email.
2. **No re-application guard** — A rejected applicant can immediately re-submit with the same guardian email, creating duplicate records and noise in the review queue.
3. **No data retention policy** — Rejected applicant data lives forever. This is a privacy concern under Ghana's Data Protection Act (Act 843).

## Design

### 1. Email Notifications on Status Changes

**Trigger:** Any status change via `PATCH /api/applicants/[id]`.

**Implementation:** After the audit log entry in the PATCH route, send an email using the same `sendEmail()` service (Resend) used for the submission confirmation. Fire-and-forget with try/catch — email failure never fails the PATCH.

**Templates** (`apps/web/services/email/templates/`):

| File                          | Status Trigger | Subject Line                                        | Key Content                                                                                   |
| ----------------------------- | -------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `application-under-review.ts` | `under_review` | "Application Under Review — EduNexus"               | "Your application for [student] is being reviewed. We'll notify you when a decision is made." |
| `application-accepted.ts`     | `accepted`     | "Congratulations — Application Accepted — EduNexus" | Includes next steps / enrollment instructions.                                                |
| `application-rejected.ts`     | `rejected`     | "Application Status Update — EduNexus"              | Regret message + "You may submit a new application after [cooldown_expiry_date]."             |
| `application-waitlisted.ts`   | `waitlisted`   | "Application Waitlisted — EduNexus"                 | Brief explanation of waitlist process.                                                        |

**Guardian email lookup:** The PATCH already reads the full `applicant` record — use `existing.guardianEmail`.

### 2. Re-application Cooldown

**Policy:** A rejected applicant may not submit a new application for **6 months** from the rejection date.

**Implementation** — in `POST /api/applicants`:

```typescript
// After parsing body and resolving schoolId, before insert:
const existing = await db
  .select({ id, status, createdAt, anonymizedAt })
  .from(applicants)
  .where(
    and(
      eq(applicants.schoolId, schoolId),
      eq(applicants.guardianEmail, parsed.data.guardianEmail),
      eq(applicants.status, "rejected"),
      isNull(applicants.anonymizedAt),
    ),
  )
  .orderBy(desc(applicants.createdAt))
  .limit(1);

if (existing) {
  const cooldownEnd = new Date(
    existing.createdAt.getTime() + 180 * 24 * 60 * 60 * 1000,
  );
  if (cooldownEnd > new Date()) {
    return apiError(
      409,
      `You may re-apply after ${cooldownEnd.toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" })}`,
    );
  }
  // Cooldown expired — anonymize the old record and let them proceed
  await anonymizeApplicant(db, existing.id);
}
```

**Behavior:**

- If a rejected + non-anonymized record exists and cooldown hasn't expired → `409` with human-readable date
- If cooldown has expired → anonymize old record in-place, allow new application (no error)
- If no matching rejected record → proceed normally

### 3. Data Anonymization

**What gets cleared** on a rejected applicant record after 6 months:

| Column                                                                    | Action                |
| ------------------------------------------------------------------------- | --------------------- |
| `anonymized_at`                                                           | Set to `now()`        |
| `first_name`, `last_name`                                                 | Set to `'[redacted]'` |
| `date_of_birth`                                                           | Set to `null`         |
| `guardian_name`                                                           | Set to `null`         |
| `guardian_email`                                                          | Set to `null`         |
| `guardian_phone`, `guardian_address`                                      | Set to `null`         |
| `guardian_occupation`, `guardian_employer`                                | Set to `null`         |
| `previous_school`                                                         | Set to `null`         |
| `medical_allergies`, `medical_conditions`, `medical_medications`          | Set to `null`         |
| `doctor_name`, `doctor_phone`                                             | Set to `null`         |
| `emergency_contacts`                                                      | Set to `null`         |
| `sibling_details`                                                         | Set to `null`         |
| `birth_certificate_file_id`, `prior_report_card_file_id`, `photo_file_id` | Set to `null`         |

**Kept:** `id`, `school_id`, `grade_level_id`, `target_class_id`, `status`, `admin_notes`, `siblings_enrolled`, `created_at`, `updated_at`, `deleted_at`, `anonymized_at`.

**Schema change:** Add `anonymized_at timestamptz` column to `applicants` table.

**Anonymization function** — reusable utility in `apps/web/services/anonymize.ts`:

```typescript
export async function anonymizeApplicant(
  client: typeof db,
  applicantId: string,
): Promise<void>;
```

**Admin-triggered cleanup endpoint:** `POST /api/applicants/cleanup` (admin role)

- Finds all `status = 'rejected'` AND `anonymized_at IS NULL` AND `created_at < 6 months ago`
- Batch-anonymizes them
- Returns count of anonymized records

### 4. Schema Changes

One new column on `applicants`:

```ts
anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
```

### 5. Tests

#### Backend Integration Tests (Vitest + Supertest)

| #   | Test                                   | Given                           | When                             | Then                                                    |
| --- | -------------------------------------- | ------------------------------- | -------------------------------- | ------------------------------------------------------- |
| T1  | Submit sends confirmation email        | Valid applicant payload         | POST /api/applicants             | Email sent to guardianEmail with "Application Received" |
| T2  | Reject sends rejection email           | Existing submitted applicant    | PATCH status → rejected          | Email sent with cooldown date                           |
| T3  | Accept sends acceptance email          | Existing under_review applicant | POST /api/applicants/[id]/accept | Email sent with next steps                              |
| T4  | Under review sends notification email  | Existing submitted applicant    | PATCH status → under_review      | Email sent                                              |
| T5  | Waitlist sends notification email      | Existing under_review applicant | PATCH status → waitlisted        | Email sent                                              |
| T6  | Re-application blocked during cooldown | Rejected applicant < 6mo        | POST same guardianEmail          | 409 + readable date                                     |
| T7  | Re-application allowed after cooldown  | Rejected applicant ≥ 6mo        | POST same guardianEmail          | 201 + old record anonymized                             |
| T8  | Anonymization clears personal data     | Rejected applicant              | Call anonymizeApplicant()        | All personal fields null/redacted                       |
| T9  | Manual cleanup endpoint                | Rejected applicants > 6mo old   | POST /api/applicants/cleanup     | All matched records anonymized                          |
| T10 | Cleanup does not touch recent records  | Rejected applicant < 6mo        | POST /api/applicants/cleanup     | Record remains intact                                   |

#### Web App Tests (Vitest + Testing Library — component) / Playwright — e2e

| #   | Test                                                | Type           | Assertion                                                       |
| --- | --------------------------------------------------- | -------------- | --------------------------------------------------------------- |
| T11 | Applicant detail page shows email send confirmation | Component test | After PATCH success, page shows updated status badge            |
| T12 | Application form shows friendly error on 409        | Component test | POST returns 409, form displays cooldown message from error     |
| T13 | Admin cleanup button on applicants list             | Component test | Button renders for admin, triggers POST /api/applicants/cleanup |
| T14 | Full review-to-accept flow                          | Playwright e2e | Admin views applicant, marks under review, accepts into class   |
| T15 | Rejected detail page shows no action buttons        | Playwright e2e | Rejected applicant page has no status transition buttons        |

## Future Considerations (Not Implemented Now)

- Configurable retention period per school (`settings.rejected_retention_days`)
- Email preference opt-out per guardian
- Bulk anonymization report for compliance audits
- S3/Cloudinary file deletion on anonymization (currently only DB fields are cleared)

## Open Questions

- Should S3/Cloudinary files also be deleted on anonymization? (Not implemented now — DB fields cleared only)
