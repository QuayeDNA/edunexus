# [3a.1.2 + 3a.1.3] Admissions Review Queue & Enhanced Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin review queue with accept/reject/waitlist (capacity-aware) and add enhanced data collection fields to the applicant form.

**Architecture:** Schema-only changes to `applicants` table (new columns) → extended API routes (POST/PATCH accept existing endpoints + new stats/accept endpoints) → admin pages at `/admin/applicants` with filterable list and detail + action views.

**Design Spec:** `docs/superpowers/specs/2026-07-15-3a12-admissions-review-queue-and-enhanced-data.md`

## Global Constraints

- All tenant-scoped tables have `school_id uuid references schools(id) not null`
- All tables have `created_at timestamptz default now() not null`
- Follow existing schema conventions (same import style as `students.ts`, `grade-levels.ts`)
- API routes use `apiSuccess`/`apiError` from `@/lib/api/response`
- Admin routes use `requireRole('admin', 'super_admin')`
- Public routes read `school_id` from `x-tenant-id` header (set by proxy) or `resolveTenant()`
- Use shadcn/ui components (`button`, `input`, `label`, `select`, `card`, `dialog`, `badge`, `table`, `skeleton`)
- No comments in code unless required by the framework
- All new columns on `applicants` table are nullable (gradual data collection)

---

## File Map

| Action | File                                                               | Responsibility                                           |
| ------ | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Modify | `packages/database/src/schema/applicants.ts`                       | Add 3a.1.3 columns + target_class_id                     |
| Modify | `apps/web/app/api/applicants/route.ts`                             | Extended POST schema, enhanced GET filters               |
| Modify | `apps/web/app/api/applicants/[id]/route.ts`                        | Extended PATCH for new fields + education fields editing |
| Create | `apps/web/app/api/applicants/stats/route.ts`                       | Status count endpoint for queue header                   |
| Create | `apps/web/app/api/applicants/[id]/accept/route.ts`                 | Accept with capacity check + class selection             |
| Modify | `apps/web/components/apply/application-form.tsx`                   | Add 3a.1.3 fields (medical, emergency contacts, etc.)    |
| Create | `apps/web/app/(school)/admin/applicants/page.tsx`                  | Review queue list page                                   |
| Create | `apps/web/app/(school)/admin/applicants/[id]/page.tsx`             | Detail page with actions                                 |
| Create | `apps/web/components/admin/applicants/applicant-stats-bar.tsx`     | Count cards by status                                    |
| Create | `apps/web/components/admin/applicants/applicant-table.tsx`         | Filterable data table                                    |
| Create | `apps/web/components/admin/applicants/applicant-detail-info.tsx`   | Detail information panels                                |
| Create | `apps/web/components/admin/applicants/applicant-documents.tsx`     | Document viewer/links                                    |
| Create | `apps/web/components/admin/applicants/applicant-actions.tsx`       | Action buttons (accept/reject/waitlist)                  |
| Create | `apps/web/components/admin/applicants/accept-applicant-dialog.tsx` | Accept dialog with class picker + capacity check         |
| Create | `apps/web/components/admin/applicants/capacity-warning-dialog.tsx` | Override confirmation dialog                             |
| Create | `apps/web/components/admin/applicants/applicant-audit-log.tsx`     | Status change timeline                                   |
| Modify | `apps/web/app/(school)/admin/dashboard/page.tsx`                   | Add link to admissions review queue                      |

---

### Task 1: Schema migration — add 3a.1.3 columns to applicants

**Files:**

- Modify: `packages/database/src/schema/applicants.ts`

**Interfaces:**

- Produces: Updated `applicants` table with new nullable columns for enhanced data + `target_class_id`

- [ ] **Step 1: Update the schema file**

Read current `packages/database/src/schema/applicants.ts` first, then edit to add the new columns after `birthCertificateFileId`:

```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  date,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { gradeLevels } from "./grade-levels";
import { classes } from "./classes";
import { mediaFiles } from "./media-files";

export const applicants = pgTable(
  "applicants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    gender: varchar("gender", { length: 10 }).notNull(),
    guardianName: varchar("guardian_name", { length: 200 }).notNull(),
    guardianEmail: varchar("guardian_email", { length: 255 }).notNull(),
    guardianPhone: varchar("guardian_phone", { length: 20 }),
    guardianAddress: text("guardian_address"),
    guardianOccupation: varchar("guardian_occupation", { length: 100 }),
    guardianEmployer: varchar("guardian_employer", { length: 200 }),
    gradeLevelId: uuid("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id),
    targetClassId: uuid("target_class_id").references(() => classes.id),
    previousSchool: varchar("previous_school", { length: 255 }),
    birthCertificateFileId: uuid("birth_certificate_file_id").references(
      () => mediaFiles.id,
    ),
    priorReportCardFileId: uuid("prior_report_card_file_id").references(
      () => mediaFiles.id,
    ),
    photoFileId: uuid("photo_file_id").references(() => mediaFiles.id),
    medicalAllergies: text("medical_allergies"),
    medicalConditions: text("medical_conditions"),
    medicalMedications: text("medical_medications"),
    doctorName: varchar("doctor_name", { length: 200 }),
    doctorPhone: varchar("doctor_phone", { length: 20 }),
    emergencyContacts: jsonb("emergency_contacts"),
    siblingsEnrolled: boolean("siblings_enrolled").default(false),
    siblingDetails: text("sibling_details"),
    status: varchar("status", { length: 20 }).default("submitted").notNull(),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_applicants_school_id").on(table.schoolId),
    index("idx_applicants_status").on(table.status),
    index("idx_applicants_school_status").on(table.schoolId, table.status),
    index("idx_applicants_target_class").on(table.targetClassId),
  ],
);
```

- [ ] **Step 2: Run typecheck**

```bash
cd packages/database && pnpm build
```

Expected: compiles without errors.

- [ ] **Step 3: Apply migration**

```bash
cd apps/web && pnpm db:migrate
```

Or if using drizzle-kit push:

```bash
cd packages/database && pnpm exec drizzle-kit push
```

Expected: tables updated with new columns.

- [ ] **Step 4: Commit**

```bash
git add packages/database/src/schema/applicants.ts
git commit -m "feat(3a.1.3): add enhanced applicant data columns"
```

---

### Task 2: Extend POST route — accept new fields

**Files:**

- Modify: `apps/web/app/api/applicants/route.ts`

**Interfaces:**

- Consumes: Updated `applicants` schema from Task 1
- Produces: Extended POST handler that accepts all 3a.1.3 fields

- [ ] **Step 1: Update the createApplicantSchema**

Edit `apps/web/app/api/applicants/route.ts`. Add to the `createApplicantSchema`:

```typescript
const createApplicantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  gender: z.enum(["male", "female"]),
  guardianName: z.string().min(1).max(200),
  guardianEmail: z.string().email(),
  guardianPhone: z.string().max(20).optional().or(z.literal("")),
  guardianAddress: z.string().optional().or(z.literal("")),
  guardianOccupation: z.string().max(100).optional().or(z.literal("")),
  guardianEmployer: z.string().max(200).optional().or(z.literal("")),
  gradeLevelId: z.string().uuid(),
  previousSchool: z.string().max(255).optional().or(z.literal("")),
  birthCertificateFileId: z.string().uuid().optional().nullable(),
  priorReportCardFileId: z.string().uuid().optional().nullable(),
  photoFileId: z.string().uuid().optional().nullable(),
  medicalAllergies: z.string().optional().or(z.literal("")),
  medicalConditions: z.string().optional().or(z.literal("")),
  medicalMedications: z.string().optional().or(z.literal("")),
  doctorName: z.string().max(200).optional().or(z.literal("")),
  doctorPhone: z.string().max(20).optional().or(z.literal("")),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        phone: z.string().min(1).max(20),
        relationship: z.string().min(1).max(50),
      }),
    )
    .optional()
    .default([]),
  siblingsEnrolled: z.boolean().optional(),
  siblingDetails: z.string().optional().or(z.literal("")),
});
```

- [ ] **Step 2: Update the POST handler values**

Replace the insert values to include new fields:

```typescript
const [applicant] = await db
  .insert(applicants)
  .values({
    schoolId,
    ...parsed.data,
    dateOfBirth: parsed.data.dateOfBirth,
    guardianPhone: parsed.data.guardianPhone || null,
    guardianAddress: parsed.data.guardianAddress || null,
    guardianOccupation: parsed.data.guardianOccupation || null,
    guardianEmployer: parsed.data.guardianEmployer || null,
    previousSchool: parsed.data.previousSchool || null,
    medicalAllergies: parsed.data.medicalAllergies || null,
    medicalConditions: parsed.data.medicalConditions || null,
    medicalMedications: parsed.data.medicalMedications || null,
    doctorName: parsed.data.doctorName || null,
    doctorPhone: parsed.data.doctorPhone || null,
    emergencyContacts:
      parsed.data.emergencyContacts.length > 0
        ? parsed.data.emergencyContacts
        : null,
    siblingsEnrolled: parsed.data.siblingsEnrolled ?? false,
    siblingDetails: parsed.data.siblingDetails || null,
  })
  .returning();
```

Also add media file linking for the new file fields:

```typescript
const fileIds = [
  parsed.data.birthCertificateFileId,
  parsed.data.priorReportCardFileId,
  parsed.data.photoFileId,
].filter(Boolean) as string[];

if (fileIds.length > 0) {
  await db
    .update(mediaFiles)
    .set({ entityId: applicant.id })
    .where(inArray(mediaFiles.id, fileIds));
}
```

Add the `inArray` import:

```typescript
import { eq, and, desc, count, inArray } from "drizzle-orm";
```

- [ ] **Step 3: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```

Expected: compiles without type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/applicants/route.ts
git commit -m "feat(3a.1.3): extend POST route with enhanced applicant fields"
```

---

### Task 3: Extend PATCH route — allow editing new fields

**Files:**

- Modify: `apps/web/app/api/applicants/[id]/route.ts`

**Interfaces:**

- Consumes: Updated `applicants` schema from Task 1
- Produces: PATCH handler that accepts all 3a.1.3 fields for admin editing

- [ ] **Step 1: Update the PATCH schema and handler**

Read the current file, then expand the `updateStatusSchema` to `updateApplicantSchema`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { applicants, auditLogs } from "@edunexus/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { resolveTenant } from "@/lib/tenant/resolve";

const validTransitions: Record<string, string[]> = {
  submitted: ["under_review", "rejected"],
  under_review: ["accepted", "rejected", "waitlisted"],
  waitlisted: ["accepted", "rejected"],
};

const updateApplicantSchema = z.object({
  status: z
    .enum(["under_review", "accepted", "rejected", "waitlisted"])
    .optional(),
  adminNotes: z.string().optional(),
  guardianName: z.string().min(1).max(200).optional(),
  guardianEmail: z.string().email().optional(),
  guardianPhone: z.string().max(20).optional(),
  guardianAddress: z.string().optional(),
  guardianOccupation: z.string().max(100).optional(),
  guardianEmployer: z.string().max(200).optional(),
  previousSchool: z.string().max(255).optional(),
  medicalAllergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  medicalMedications: z.string().optional(),
  doctorName: z.string().max(200).optional(),
  doctorPhone: z.string().max(20).optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        phone: z.string().min(1).max(20),
        relationship: z.string().min(1).max(50),
      }),
    )
    .optional(),
  siblingsEnrolled: z.boolean().optional(),
  siblingDetails: z.string().optional(),
});

async function resolveSchoolId(request: NextRequest): Promise<string | null> {
  const host = request.headers.get("host") ?? "";
  const tenant = await resolveTenant(host);
  return tenant.schoolId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError } = await requireRole("admin", "super_admin");
  if (authError) return authError;

  const schoolId = await resolveSchoolId(request);
  if (!schoolId) return apiError(400, "Tenant not resolved");

  const [applicant] = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.schoolId, schoolId)))
    .limit(1);

  if (!applicant) return apiError(404, "Applicant not found");
  return apiSuccess(applicant);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError, user } = await requireRole("admin", "super_admin");
  if (authError) return authError;

  const schoolId = await resolveSchoolId(request);
  if (!schoolId) return apiError(400, "Tenant not resolved");

  const [existing] = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.schoolId, schoolId)))
    .limit(1);
  if (!existing) return apiError(404, "Applicant not found");

  const body = await request.json();
  const parsed = updateApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      422,
      "Validation failed",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.data.status) {
    const allowed = validTransitions[existing.status];
    if (!allowed || !allowed.includes(parsed.data.status)) {
      return apiError(
        422,
        `Cannot transition from '${existing.status}' to '${parsed.data.status}'`,
      );
    }
    updateData.status = parsed.data.status;
  }

  const editableFields = [
    "adminNotes",
    "guardianName",
    "guardianEmail",
    "guardianPhone",
    "guardianAddress",
    "guardianOccupation",
    "guardianEmployer",
    "previousSchool",
    "medicalAllergies",
    "medicalConditions",
    "medicalMedications",
    "doctorName",
    "doctorPhone",
    "emergencyContacts",
    "siblingsEnrolled",
    "siblingDetails",
  ] as const;

  for (const field of editableFields) {
    if (parsed.data[field] !== undefined) {
      updateData[field] = parsed.data[field] ?? null;
    }
  }

  const [updated] = await db
    .update(applicants)
    .set(updateData)
    .where(eq(applicants.id, id))
    .returning();

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await db.insert(auditLogs).values({
      schoolId,
      userId: user!.id,
      action: "applicant.status_changed",
      tableName: "applicants",
      recordId: id,
      oldData: { status: existing.status },
      newData: { status: parsed.data.status },
    });
  }

  if (Object.keys(updateData).length > 1) {
    await db.insert(auditLogs).values({
      schoolId,
      userId: user!.id,
      action: "applicant.updated",
      tableName: "applicants",
      recordId: id,
      oldData: {},
      newData: updateData,
    });
  }

  return apiSuccess(updated);
}
```

- [ ] **Step 2: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```

Expected: compiles without type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/applicants/\[id\]/route.ts
git commit -m "feat(3a.1.2): extend PATCH route for status changes and field editing"
```

---

### Task 4: Stats endpoint

**Files:**

- Create: `apps/web/app/api/applicants/stats/route.ts`

- [ ] **Step 1: Create the stats route**

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { applicants } from "@edunexus/database";
import { eq, count, sql } from "drizzle-orm";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { resolveTenant } from "@/lib/tenant/resolve";

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole("admin", "super_admin");
  if (authError) return authError;

  const host = request.headers.get("host") ?? "";
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, "Tenant not resolved");

  const statuses = [
    "submitted",
    "under_review",
    "accepted",
    "rejected",
    "waitlisted",
  ] as const;

  const counts = await db
    .select({
      status: applicants.status,
      count: count(),
    })
    .from(applicants)
    .where(eq(applicants.schoolId, schoolId))
    .groupBy(applicants.status);

  const countMap: Record<string, number> = {};
  for (const row of counts) {
    countMap[row.status] = Number(row.count);
  }

  const result: Record<string, number> = { total: 0 };
  for (const s of statuses) {
    result[s] = countMap[s] ?? 0;
    result.total += result[s];
  }

  return apiSuccess(result);
}
```

- [ ] **Step 2: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```

Expected: compiles without type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/applicants/stats/route.ts
git commit -m "feat(3a.1.2): add applicant stats endpoint"
```

---

### Task 5: Accept endpoint with capacity check

**Files:**

- Create: `apps/web/app/api/applicants/[id]/accept/route.ts`

- [ ] **Step 1: Create the accept route**

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { applicants, classes, auditLogs } from "@edunexus/database";
import { eq, and, count } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/api/require-role";
import { apiSuccess, apiError } from "@/lib/api/response";
import { resolveTenant } from "@/lib/tenant/resolve";

const acceptSchema = z.object({
  targetClassId: z.string().uuid(),
  adminNotes: z.string().optional(),
  sendEmail: z.boolean().default(false),
  override: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError, user } = await requireRole("admin", "super_admin");
  if (authError) return authError;

  const host = request.headers.get("host") ?? "";
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, "Tenant not resolved");

  const [existing] = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, id), eq(applicants.schoolId, schoolId)))
    .limit(1);
  if (!existing) return apiError(404, "Applicant not found");

  if (existing.status !== "under_review" && existing.status !== "waitlisted") {
    return apiError(
      422,
      `Cannot accept from '${existing.status}' — must be 'under_review' or 'waitlisted'`,
    );
  }

  const body = await request.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      422,
      "Validation failed",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const [targetClass] = await db
    .select()
    .from(classes)
    .where(
      and(
        eq(classes.id, parsed.data.targetClassId),
        eq(classes.schoolId, schoolId),
      ),
    )
    .limit(1);
  if (!targetClass) return apiError(404, "Target class not found");

  if (targetClass.gradeLevelId !== existing.gradeLevelId) {
    return apiError(422, "Target class does not match applicant's grade level");
  }

  const [acceptedResult] = await db
    .select({ count: count() })
    .from(applicants)
    .where(
      and(
        eq(applicants.targetClassId, parsed.data.targetClassId),
        eq(applicants.status, "accepted"),
      ),
    );
  const acceptedCount = Number(acceptedResult.count);
  const capacity = targetClass.capacity ?? 999;
  const available = capacity - acceptedCount;

  if (available <= 0 && !parsed.data.override) {
    return apiError(
      409,
      `Class '${targetClass.name}' is at capacity (${acceptedCount}/${capacity}). Please select a different class or enable override to confirm.`,
    );
  }

  const [updated] = await db
    .update(applicants)
    .set({
      status: "accepted",
      targetClassId: parsed.data.targetClassId,
      adminNotes:
        parsed.data.adminNotes !== undefined
          ? parsed.data.adminNotes
          : existing.adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(applicants.id, id))
    .returning();

  await db.insert(auditLogs).values({
    schoolId,
    userId: user!.id,
    action: "applicant.accepted",
    tableName: "applicants",
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: "accepted", targetClassId: parsed.data.targetClassId },
  });

  if (parsed.data.sendEmail) {
    // Email dispatch placeholder — will use sendEmail() from services
    // once template is created (future task)
  }

  return apiSuccess(updated);
}
```

- [ ] **Step 2: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```

Expected: compiles without type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/applicants/\[id\]/accept/route.ts
git commit -m "feat(3a.1.2): add accept endpoint with class capacity check"
```

---

### Task 6: Extended application form with 3a.1.3 fields

**Files:**

- Modify: `apps/web/components/apply/application-form.tsx`

**Interfaces:**

- Consumes: Extended POST schema from Task 2
- Produces: Client form with all enhanced fields

- [ ] **Step 1: Update the form schema**

Read `apps/web/components/apply/application-form.tsx`. Replace the `formSchema` to include all new fields:

```typescript
const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().min(1, "Phone is required").max(20),
  relationship: z.string().min(1, "Relationship is required").max(50),
});

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  gender: z.enum(["male", "female"], { required_error: "Gender is required" }),
  guardianName: z.string().min(1, "Guardian name is required").max(200),
  guardianEmail: z.string().email("Valid email is required"),
  guardianPhone: z.string().optional(),
  guardianAddress: z.string().optional(),
  guardianOccupation: z.string().optional(),
  guardianEmployer: z.string().optional(),
  gradeLevelId: z.string().min(1, "Grade level is required"),
  previousSchool: z.string().optional(),
  medicalAllergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  medicalMedications: z.string().optional(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),
  siblingsEnrolled: z.boolean().optional(),
  siblingDetails: z.string().optional(),
});
```

- [ ] **Step 2: Add emergency contacts state management**

In the component, add state:

```typescript
const [emergencyContacts, setEmergencyContacts] = useState<
  Array<{ name: string; phone: string; relationship: string }>
>([]);
const [newContact, setNewContact] = useState({
  name: "",
  phone: "",
  relationship: "",
});
```

Add handlers:

```typescript
const addEmergencyContact = () => {
  if (!newContact.name || !newContact.phone || !newContact.relationship) return;
  setEmergencyContacts((prev) => [...prev, newContact]);
  setNewContact({ name: "", phone: "", relationship: "" });
};

const removeEmergencyContact = (index: number) => {
  setEmergencyContacts((prev) => prev.filter((_, i) => i !== index));
};
```

- [ ] **Step 3: Add form sections to the JSX**

After the "Guardian Information" section, add:

**Guardian Occupation section:**

```tsx
<div className="grid gap-4 sm:grid-cols-2">
  <div className="space-y-2">
    <Label htmlFor="guardianOccupation">Occupation</Label>
    <Input id="guardianOccupation" {...register("guardianOccupation")} />
  </div>
  <div className="space-y-2">
    <Label htmlFor="guardianEmployer">Employer</Label>
    <Input id="guardianEmployer" {...register("guardianEmployer")} />
  </div>
</div>
```

**Medical Information section (after Documents):**

```tsx
<CardHeader className="px-0 pt-4">
  <CardTitle>Medical Information</CardTitle>
</CardHeader>

<div className="space-y-2">
  <Label htmlFor="medicalAllergies">Allergies</Label>
  <textarea
    id="medicalAllergies"
    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    {...register('medicalAllergies')}
  />
</div>

<div className="space-y-2">
  <Label htmlFor="medicalConditions">Medical Conditions</Label>
  <textarea
    id="medicalConditions"
    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    {...register('medicalConditions')}
  />
</div>

<div className="space-y-2">
  <Label htmlFor="medicalMedications">Current Medications</Label>
  <textarea
    id="medicalMedications"
    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    {...register('medicalMedications')}
  />
</div>

<div className="grid gap-4 sm:grid-cols-2">
  <div className="space-y-2">
    <Label htmlFor="doctorName">Doctor Name</Label>
    <Input id="doctorName" {...register('doctorName')} />
  </div>
  <div className="space-y-2">
    <Label htmlFor="doctorPhone">Doctor Phone</Label>
    <Input id="doctorPhone" {...register('doctorPhone')} />
  </div>
</div>
```

**Emergency Contacts section:**

```tsx
<CardHeader className="px-0 pt-4">
  <CardTitle>Emergency Contacts</CardTitle>
</CardHeader>

<div className="space-y-4">
  <div className="grid gap-4 sm:grid-cols-4">
    <div className="space-y-2 sm:col-span-1">
      <Label>Name</Label>
      <Input
        value={newContact.name}
        onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Full name"
      />
    </div>
    <div className="space-y-2 sm:col-span-1">
      <Label>Phone</Label>
      <Input
        value={newContact.phone}
        onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
        placeholder="Phone number"
      />
    </div>
    <div className="space-y-2 sm:col-span-1">
      <Label>Relationship</Label>
      <Input
        value={newContact.relationship}
        onChange={e => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
        placeholder="e.g. Mother"
      />
    </div>
    <div className="flex items-end sm:col-span-1">
      <Button type="button" variant="outline" className="w-full" onClick={addEmergencyContact}>
        Add Contact
      </Button>
    </div>
  </div>

  {emergencyContacts.length > 0 && (
    <ul className="space-y-1">
      {emergencyContacts.map((contact, i) => (
        <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span>{contact.name} — {contact.relationship} ({contact.phone})</span>
          <button type="button" onClick={() => removeEmergencyContact(i)} className="text-destructive hover:underline">
            Remove
          </button>
        </li>
      ))}
    </ul>
  )}
</div>
```

**Siblings section:**

```tsx
<CardHeader className="px-0 pt-4">
  <CardTitle>Siblings</CardTitle>
</CardHeader>

<div className="space-y-2">
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      id="siblingsEnrolled"
      className="h-4 w-4 rounded border-gray-300"
      {...register('siblingsEnrolled')}
    />
    <Label htmlFor="siblingsEnrolled">Has siblings already enrolled</Label>
  </div>
  <div className="space-y-2">
    <Label htmlFor="siblingDetails">Sibling Details</Label>
    <textarea
      id="siblingDetails"
      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      placeholder="Names and classes of siblings"
      {...register('siblingDetails')}
    />
  </div>
</div>
```

- [ ] **Step 4: Update the submit handler to include all fields**

In `onSubmit`, change the fetch body to include all form data plus emergency contacts:

```typescript
const onSubmit = async (data: FormValues) => {
  setSubmitState("submitting");
  setServerError("");

  try {
    const fileIds: Record<string, string | null> = {};
    if (birthCertificateFileId)
      fileIds.birthCertificateFileId = birthCertificateFileId;
    if (reportCardFileId) fileIds.priorReportCardFileId = reportCardFileId;
    if (photoFileId) fileIds.photoFileId = photoFileId;

    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        emergencyContacts,
        ...fileIds,
        documentUrls: [],
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setServerError(json.error || "Submission failed");
      setSubmitState("error");
      return;
    }

    setSubmitState("success");
  } catch {
    setServerError("Network error. Please try again.");
    setSubmitState("error");
  }
};
```

Also add state for new file uploads:

```typescript
const [birthCertificateFileId, setBirthCertificateFileId] = useState<
  string | null
>(null);
const [reportCardFileId, setReportCardFileId] = useState<string | null>(null);
const [photoFileId, setPhotoFileId] = useState<string | null>(null);
```

Add file input for report card and photo alongside existing birth certificate upload.

- [ ] **Step 5: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```

Expected: compiles without type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/apply/application-form.tsx
git commit -m "feat(3a.1.3): add enhanced fields to application form"
```

---

### Task 7: Admin review queue list page

**Files:**

- Create: `apps/web/app/(school)/admin/applicants/page.tsx`
- Create: `apps/web/components/admin/applicants/applicant-stats-bar.tsx`
- Create: `apps/web/components/admin/applicants/applicant-table.tsx`

- [ ] **Step 1: Create the stats bar component**

`apps/web/components/admin/applicants/applicant-stats-bar.tsx`:

```tsx
"use client";

import type { ApplicantStats } from "@/types/applicant";
import { Card, CardContent } from "@/components/ui/card";

interface StatsBarProps {
  stats: ApplicantStats;
  activeStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  submitted: {
    label: "Submitted",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  under_review: {
    label: "Under Review",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-50 text-green-700 border-green-200",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  waitlisted: {
    label: "Waitlisted",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

export function ApplicantStatsBar({
  stats,
  activeStatus,
  onStatusChange,
}: StatsBarProps) {
  const allActive = activeStatus === null;

  return (
    <div className="grid grid-cols-6 gap-3">
      <Card
        className={`cursor-pointer transition-shadow hover:shadow-md ${allActive ? "ring-2 ring-primary" : ""}`}
        onClick={() => onStatusChange(null)}
      >
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">All</p>
        </CardContent>
      </Card>
      {Object.entries(statusConfig).map(([key, config]) => {
        const isActive = activeStatus === key;
        return (
          <Card
            key={key}
            className={`cursor-pointer transition-shadow hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""}`}
            onClick={() => onStatusChange(key)}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {stats[key as keyof ApplicantStats]}
              </p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create shared types**

`apps/web/types/applicant.ts`:

```typescript
export interface ApplicantStats {
  total: number;
  submitted: number;
  under_review: number;
  accepted: number;
  rejected: number;
  waitlisted: number;
}

export interface ApplicantListItem {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  guardianEmail: string;
  status: string;
  gradeLevelId: string;
  createdAt: string;
}
```

- [ ] **Step 3: Create the applicant table component**

`apps/web/components/admin/applicants/applicant-table.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ApplicantStatsBar } from "./applicant-stats-bar";
import type { ApplicantStats, ApplicantListItem } from "@/types/applicant";

const statusBadge: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  waitlisted: "bg-purple-100 text-purple-800",
};

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
};

interface ApplicantTableProps {
  gradeLevels: Array<{ id: string; name: string; code: string }>;
}

export function ApplicantTable({ gradeLevels }: ApplicantTableProps) {
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [stats, setStats] = useState<ApplicantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [gradeLevelId, setGradeLevelId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (gradeLevelId) params.set("gradeLevelId", gradeLevelId);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const [applicantsRes, statsRes] = await Promise.all([
        fetch(`/api/applicants?${params}`),
        fetch("/api/applicants/stats"),
      ]);

      if (applicantsRes.ok) {
        const data = await applicantsRes.json();
        setApplicants(data.data ?? []);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [status, gradeLevelId, page]);

  useEffect(() => {
    setPage(1);
  }, [status, gradeLevelId]);

  return (
    <div className="space-y-6">
      {stats && (
        <ApplicantStatsBar
          stats={stats}
          activeStatus={status}
          onStatusChange={setStatus}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={gradeLevelId} onValueChange={setGradeLevelId}>
            <SelectTrigger>
              <SelectValue placeholder="All grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All grades</SelectItem>
              {gradeLevels.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name or guardian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchData();
            }}
          />
        </div>
        <Button variant="outline" onClick={fetchData}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : applicants.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No applicants found</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Guardian
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date Applied
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/applicants/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.firstName} {a.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadge[a.status] ?? ""}>
                        {statusLabel[a.status] ?? a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {a.guardianName}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("en-GH")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/applicants/${a.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{total} total</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the list page**

`apps/web/app/(school)/admin/applicants/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { gradeLevels } from "@edunexus/database";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/auth.guard";
import { ApplicantTable } from "@/components/admin/applicants/applicant-table";

export const dynamic = "force-dynamic";

export default async function ApplicantsPage() {
  const session = await requireRole("admin", "super_admin");
  const schoolGrades = session.user.schoolId
    ? await db
        .select()
        .from(gradeLevels)
        .where(eq(gradeLevels.schoolId, session.user.schoolId))
        .orderBy(gradeLevels.sortOrder)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admissions Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review, filter, and process applicant submissions
        </p>
      </div>
      <ApplicantTable gradeLevels={schoolGrades} />
    </div>
  );
}
```

- [ ] **Step 5: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```

Expected: compiles without type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(school\)/admin/applicants/page.tsx apps/web/components/admin/applicants/applicant-stats-bar.tsx apps/web/components/admin/applicants/applicant-table.tsx apps/web/types/applicant.ts
git commit -m "feat(3a.1.2): add applicants review queue list page"
```

---

### Task 8: Applicant detail page with actions

**Files:**

- Create: `apps/web/app/(school)/admin/applicants/[id]/page.tsx`
- Create: `apps/web/components/admin/applicants/applicant-detail-info.tsx`
- Create: `apps/web/components/admin/applicants/applicant-documents.tsx`
- Create: `apps/web/components/admin/applicants/applicant-actions.tsx`
- Create: `apps/web/components/admin/applicants/accept-applicant-dialog.tsx`
- Create: `apps/web/components/admin/applicants/capacity-warning-dialog.tsx`
- Create: `apps/web/components/admin/applicants/applicant-audit-log.tsx`

- [ ] **Step 1: Create the detail info component**

`apps/web/components/admin/applicants/applicant-detail-info.tsx`:

```tsx
"use client";

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface ApplicantDetail {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string | null;
  guardianAddress: string | null;
  guardianOccupation: string | null;
  guardianEmployer: string | null;
  previousSchool: string | null;
  medicalAllergies: string | null;
  medicalConditions: string | null;
  medicalMedications: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  emergencyContacts: EmergencyContact[] | null;
  siblingsEnrolled: boolean | null;
  siblingDetails: string | null;
  status: string;
  createdAt: string;
}

interface DetailInfoProps {
  applicant: ApplicantDetail;
}

export function ApplicantDetailInfo({ applicant }: DetailInfoProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Student Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">
                {applicant.firstName} {applicant.lastName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date of Birth</dt>
              <dd>
                {new Date(applicant.dateOfBirth).toLocaleDateString("en-GH")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="capitalize">{applicant.gender}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Previous School</dt>
              <dd>{applicant.previousSchool ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Guardian Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{applicant.guardianName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{applicant.guardianEmail}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{applicant.guardianPhone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Address</dt>
              <dd>{applicant.guardianAddress ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Occupation</dt>
              <dd>{applicant.guardianOccupation ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Employer</dt>
              <dd>{applicant.guardianEmployer ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Medical Information
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Allergies</dt>
              <dd>{applicant.medicalAllergies || "None recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Conditions</dt>
              <dd>{applicant.medicalConditions || "None recorded"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Medications</dt>
              <dd>{applicant.medicalMedications || "None recorded"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Doctor</dt>
              <dd>
                {applicant.doctorName
                  ? `${applicant.doctorName} (${applicant.doctorPhone ?? "—"})`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Emergency Contacts
          </h3>
          {applicant.emergencyContacts &&
          applicant.emergencyContacts.length > 0 ? (
            <ul className="space-y-2">
              {applicant.emergencyContacts.map((c, i) => (
                <li key={i} className="rounded-md bg-muted px-3 py-2 text-sm">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground">
                    {c.relationship} — {c.phone}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No emergency contacts
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Siblings
          </h3>
          <p className="text-sm">
            {applicant.siblingsEnrolled
              ? "Has siblings enrolled"
              : "No siblings enrolled"}
          </p>
          {applicant.siblingDetails && (
            <p className="mt-1 text-sm text-muted-foreground">
              {applicant.siblingDetails}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the documents component**

`apps/web/components/admin/applicants/applicant-documents.tsx`:

```tsx
"use client";

interface ApplicantDocumentsProps {
  birthCertificateFileId: string | null;
  priorReportCardFileId: string | null;
  photoFileId: string | null;
}

export function ApplicantDocuments({
  birthCertificateFileId,
  priorReportCardFileId,
  photoFileId,
}: ApplicantDocumentsProps) {
  const docs = [
    { label: "Birth Certificate", id: birthCertificateFileId },
    { label: "Prior Report Card", id: priorReportCardFileId },
    { label: "Applicant Photo", id: photoFileId },
  ].filter((d) => d.id);

  if (docs.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Documents
        </h3>
        <p className="text-sm text-muted-foreground">No documents uploaded</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Documents
      </h3>
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li key={doc.id}>
            <a
              href={`/api/media/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-primary hover:underline"
            >
              <span>{doc.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Create the audit log component**

`apps/web/components/admin/applicants/applicant-audit-log.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  action: string;
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogProps {
  applicantId: string;
}

export function ApplicantAuditLog({ applicantId }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/audit-logs?tableName=applicants&recordId=${applicantId}`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => setEntries(data.data ?? []))
      .finally(() => setLoading(false));
  }, [applicantId]);

  if (loading) return null;

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Activity Log
        </h3>
        <p className="text-sm text-muted-foreground">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Activity Log
      </h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 text-sm">
            <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
            <div>
              <p className="font-medium">{entry.action.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString("en-GH")}
              </p>
              {entry.newData?.status && (
                <p className="text-xs text-muted-foreground">
                  Status →{" "}
                  {(entry.newData as Record<string, unknown>).status as string}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the accept dialog with capacity check**

`apps/web/components/admin/applicants/accept-applicant-dialog.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
}

interface AcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  gradeLevelId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function AcceptApplicantDialog({
  open,
  onOpenChange,
  applicantId,
  gradeLevelId,
  onSuccess,
  onError,
}: AcceptDialogProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const [override, setOverride] = useState(false);

  useEffect(() => {
    if (open) {
      fetch(`/api/classes?gradeLevelId=${gradeLevelId}`)
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((data) => setClasses(data.data ?? []));
      setSelectedClassId("");
      setCapacityWarning(null);
      setOverride(false);
    }
  }, [open, gradeLevelId]);

  const handleAccept = async () => {
    if (!selectedClassId) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/applicants/${applicantId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetClassId: selectedClassId,
          override,
        }),
      });

      const body = await res.json();

      if (res.status === 409) {
        setCapacityWarning(body.error);
        return;
      }

      if (!res.ok) {
        onError(body.error ?? "Failed to accept applicant");
        return;
      }

      onSuccess();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Applicant</DialogTitle>
          <DialogDescription>
            Select a class to place the student in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code}) — Capacity: {c.capacity ?? "Unlimited"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {capacityWarning && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {capacityWarning}
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-sm text-amber-700">
                    <input
                      type="checkbox"
                      checked={override}
                      onChange={(e) => setOverride(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300"
                    />
                    Override — accept despite capacity limit
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!selectedClassId || submitting}
          >
            {submitting ? "Accepting..." : "Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Create the actions component**

`apps/web/components/admin/applicants/applicant-actions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AcceptApplicantDialog } from "./accept-applicant-dialog";

interface ActionsProps {
  applicantId: string;
  status: string;
  gradeLevelId: string;
  onStatusChange: () => void;
}

const validActions: Record<string, string[]> = {
  submitted: ["under_review", "rejected"],
  under_review: ["accepted", "rejected", "waitlisted"],
  waitlisted: ["accepted", "rejected"],
};

const actionLabels: Record<string, string> = {
  under_review: "Mark Under Review",
  accepted: "Accept",
  rejected: "Reject",
  waitlisted: "Waitlist",
};

export function ApplicantActions({
  applicantId,
  status,
  gradeLevelId,
  onStatusChange,
}: ActionsProps) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const allowed = validActions[status] ?? [];

  const handleAction = async (newStatus: string) => {
    if (newStatus === "accepted") {
      setAcceptOpen(true);
      return;
    }

    setSubmitting(newStatus);
    setError("");

    try {
      const res = await fetch(`/api/applicants/${applicantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to update status");
        return;
      }

      onStatusChange();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {allowed.map((action) => (
            <Button
              key={action}
              variant={
                action === "rejected"
                  ? "destructive"
                  : action === "accepted"
                    ? "default"
                    : "outline"
              }
              onClick={() => handleAction(action)}
              disabled={submitting !== null}
            >
              {submitting === action
                ? "Processing..."
                : (actionLabels[action] ?? action)}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <AcceptApplicantDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        applicantId={applicantId}
        gradeLevelId={gradeLevelId}
        onSuccess={onStatusChange}
        onError={setError}
      />
    </>
  );
}
```

- [ ] **Step 6: Create the detail page**

`apps/web/app/(school)/admin/applicants/[id]/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { applicants, gradeLevels } from "@edunexus/database";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth/auth.guard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApplicantDetailInfo } from "@/components/admin/applicants/applicant-detail-info";
import { ApplicantDocuments } from "@/components/admin/applicants/applicant-documents";
import { ApplicantActions } from "@/components/admin/applicants/applicant-actions";
import { ApplicantAuditLog } from "@/components/admin/applicants/applicant-audit-log";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, string> = {
  submitted: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  waitlisted: "bg-purple-100 text-purple-800",
};

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
};

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("admin", "super_admin");

  const [applicant] = await db
    .select()
    .from(applicants)
    .where(
      and(
        eq(applicants.id, id),
        eq(applicants.schoolId, session.user.schoolId!),
      ),
    )
    .limit(1);

  if (!applicant) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/applicants"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {applicant.firstName} {applicant.lastName}
            </h1>
            <Badge className={statusBadge[applicant.status] ?? ""}>
              {statusLabel[applicant.status] ?? applicant.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Applied{" "}
            {new Date(applicant.createdAt).toLocaleDateString("en-GH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <ApplicantActions
        applicantId={applicant.id}
        status={applicant.status}
        gradeLevelId={applicant.gradeLevelId}
        onStatusChange={() => {}}
      />

      <ApplicantDocuments
        birthCertificateFileId={applicant.birthCertificateFileId}
        priorReportCardFileId={applicant.priorReportCardFileId}
        photoFileId={applicant.photoFileId}
      />

      <ApplicantDetailInfo
        applicant={{
          ...applicant,
          emergencyContacts: applicant.emergencyContacts as Array<{
            name: string;
            phone: string;
            relationship: string;
          }> | null,
        }}
      />

      <ApplicantAuditLog applicantId={applicant.id} />
    </div>
  );
}
```

- [ ] **Step 7: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```

Expected: compiles without type errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/\(school\)/admin/applicants/\[id\]/page.tsx apps/web/components/admin/applicants/applicant-detail-info.tsx apps/web/components/admin/applicants/applicant-documents.tsx apps/web/components/admin/applicants/applicant-actions.tsx apps/web/components/admin/applicants/accept-applicant-dialog.tsx apps/web/components/admin/applicants/applicant-audit-log.tsx
git commit -m "feat(3a.1.2): add applicant detail page with actions and accept flow"
```

---

### Task 9: Add admin dashboard link

**Files:**

- Modify: `apps/web/app/(school)/admin/dashboard/page.tsx`

- [ ] **Step 1: Add link to admissions queue**

In the Quick Actions section, add an admissions review card after "Add New Student":

```tsx
<Link href="/admin/applicants">
  <Card className="cursor-pointer transition-shadow hover:shadow-md">
    <CardContent className="flex items-center gap-4 p-6">
      <div className="rounded-xl bg-brand-50 p-3">
        <GraduationCap className="h-5 w-5 text-brand-600" />
      </div>
      <div>
        <CardTitle className="text-sm font-medium">
          Review Applications
        </CardTitle>
        <CardDescription>Process admission applications</CardDescription>
      </div>
    </CardContent>
  </Card>
</Link>
```

Ensure `GraduationCap` is imported from `lucide-react` (it should already be in the imports).

- [ ] **Step 2: Build and commit**

```bash
cd apps/web && npx next build 2>&1 | tail -30
git add apps/web/app/\(school\)/admin/dashboard/page.tsx
git commit -m "feat(3a.1.2): add link to admissions review queue from admin dashboard"
```

---

### Task 10: Full build verification

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: all packages compile, TypeScript passes, all routes listed including the new `/admin/applicants` pages and `/api/applicants/stats` and `/api/applicants/[id]/accept` endpoints.

- [ ] **Step 2: Commit any final fixes**

```bash
git add -A
git commit -m "chore: fix build issues for admissions review queue"
```

---

## Updating Remote GitHub Issues

After the implementation is done, update the GitHub issue descriptions:

```bash
# Update issue 3a.1.2 with the new description and tasks
gh issue edit <ISSUE_ID_3a1.2> \
  --title "[3a.1.2] Admissions review queue (admin)" \
  --body "## Description

Admin review queue with list/filter, detail view, accept/reject/waitlist actions, and capacity check against Class max size.

## Tasks
- [ ] Schema — add 3a.1.3 columns, target\\_class\\_id
- [ ] API — extended POST, PATCH, stats endpoint, accept endpoint
- [ ] UI — review queue list page with filters
- [ ] UI — applicant detail page with actions and accept dialog
- [ ] UI — extended application form with 3a.1.3 fields

## Acceptance Criteria
- Given a class is at capacity, when an admin tries to accept an applicant into it, then the system warns and requires override confirmation.
- Given an admin opens /admin/applicants, then they see a paginated list with status and grade level filters.
- Given a guardian opens the application form, then they see enhanced fields for medical info, emergency contacts, and documents."

# Create issue 3a.1.3 as sub-issue and link it
gh issue create \
  --title "[3a.1.3] Enhanced applicant data collection" \
  --body "## Description

Post-MVP enhancement of the application form with additional fields for medical information, emergency contacts, guardian occupation, prior report card upload, applicant photo, and sibling information.

## Tasks
- [x] Birth certificate upload (PR #118)
- [ ] Prior report card upload
- [ ] Guardian occupation & employer field
- [ ] Medical info fields (allergies, conditions, medications, doctor)
- [ ] Emergency contacts (multi-entry)
- [ ] Siblings enrolled checkbox + details
- [ ] Applicant photo upload

## Sub-issue of: [3a.1.2]
Depends on: 3a.1.1" \
  --parent <ISSUE_ID_3a1.2>
```

To find issue IDs:

```bash
gh issue list --label "Phase 3a" --json number,title
```
