# [3a.1.1] Public Application Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement applicant intake: `applicants` schema, public submission at `/apply`, admin review API, email confirmation, Cloudinary file upload stub.

**Architecture:** New Drizzle table → public POST route (no auth) + admin GET/PATCH routes (admin role-gated) → Server Component page at `/apply` with client-side form → existing `sendEmail()` for confirmation → direct-to-Cloudinary unsigned upload for files.

**Tech Stack:** Drizzle ORM, Next.js 16 App Router, shadcn/ui, Resend, Cloudinary unsigned upload

**Design Spec:** `docs/superpowers/specs/2026-07-10-3a1-applicants-schema-and-application-form.md`

## Global Constraints

- All tenant-scoped tables have `school_id uuid references schools(id) not null`
- All tables have `created_at timestamptz default now() not null`
- Follow existing schema conventions (same import style as `students.ts`, `grade-levels.ts`)
- API routes use `apiSuccess`/`apiError` from `@/lib/api/response`
- Admin routes use `requireRole('admin', 'super_admin')` for auth
- Public routes read `school_id` from `x-tenant-id` header (set by proxy)
- Form styled with shadcn/ui components (`input`, `button`, `label`, `select`, `card`, `skeleton`)
- No comments in code unless required by the framework

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `packages/database/src/schema/applicants.ts` | Drizzle schema for `applicants` table |
| Modify | `packages/database/src/schema/index.ts` | Add `applicants` export |
| Create | `apps/web/app/api/applicants/route.ts` | POST (public) + GET (admin list) |
| Create | `apps/web/app/api/applicants/[id]/route.ts` | GET (admin detail) + PATCH (status change) |
| Create | `apps/web/services/email/templates/application-confirmation.ts` | HTML email template |
| Create | `apps/web/app/apply/page.tsx` | Server component — fetches grade levels, renders form |
| Create | `apps/web/components/apply/application-form.tsx` | Client component — form with validation + Cloudinary upload |

---

### Task 1: Create `applicants` schema

**Files:**
- Create: `packages/database/src/schema/applicants.ts`
- Modify: `packages/database/src/schema/index.ts`

- [x] **Step 1: Create the schema file**

Write `packages/database/src/schema/applicants.ts`:

```typescript
import { pgTable, uuid, text, timestamp, varchar, date, index } from 'drizzle-orm/pg-core';
import { schools } from './schools';
import { gradeLevels } from './grade-levels';

export const applicants = pgTable('applicants', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => schools.id),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  guardianName: varchar('guardian_name', { length: 200 }).notNull(),
  guardianEmail: varchar('guardian_email', { length: 255 }).notNull(),
  guardianPhone: varchar('guardian_phone', { length: 20 }),
  guardianAddress: text('guardian_address'),
  gradeLevelId: uuid('grade_level_id').notNull().references(() => gradeLevels.id),
  previousSchool: varchar('previous_school', { length: 255 }),
  documentUrls: text('document_urls').array(),
  status: varchar('status', { length: 20 }).default('submitted').notNull(),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_applicants_school_id').on(table.schoolId),
  index('idx_applicants_status').on(table.status),
  index('idx_applicants_school_status').on(table.schoolId, table.status),
]);
```

- [x] **Step 2: Export from index**

Add to `packages/database/src/schema/index.ts` (in alphabetical position):

```typescript
export { applicants } from './applicants';
```

- [x] **Step 3: Run typecheck**

```bash
cd packages/database && pnpm build
```
Expected: compiles without errors.

- [x] **Step 4: Commit**

```bash
git add packages/database/src/schema/applicants.ts packages/database/src/schema/index.ts
git commit -m "feat: add applicants schema"
```

---

### Task 2: Public POST route + admin GET list route

**Files:**
- Create: `apps/web/app/api/applicants/route.ts`

- [x] **Step 1: Create the route file**

Write `apps/web/app/api/applicants/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { applicants, gradeLevels } from '@edunexus/database/src/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { sendEmail } from '@/services/email';
import { applicationConfirmationEmail } from '@/services/email/templates/application-confirmation';

const createApplicantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  gender: z.enum(['male', 'female']),
  guardianName: z.string().min(1).max(200),
  guardianEmail: z.string().email(),
  guardianPhone: z.string().max(20).optional().or(z.literal('')),
  guardianAddress: z.string().optional().or(z.literal('')),
  gradeLevelId: z.string().uuid(),
  previousSchool: z.string().max(255).optional().or(z.literal('')),
  documentUrls: z.array(z.string().url()).optional().default([]),
});

export async function POST(request: NextRequest) {
  const schoolId = request.headers.get('x-tenant-id');
  if (!schoolId) {
    return apiError(400, 'Tenant not resolved');
  }

  const body = await request.json();
  const parsed = createApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [gradeLevel] = await db.select().from(gradeLevels).where(and(
    eq(gradeLevels.id, parsed.data.gradeLevelId),
    eq(gradeLevels.schoolId, schoolId),
  ));
  if (!gradeLevel) {
    return apiError(422, 'Invalid grade level');
  }

  const [applicant] = await db.insert(applicants).values({
    schoolId,
    ...parsed.data,
    dateOfBirth: parsed.data.dateOfBirth,
    guardianPhone: parsed.data.guardianPhone || null,
    guardianAddress: parsed.data.guardianAddress || null,
    previousSchool: parsed.data.previousSchool || null,
    documentUrls: parsed.data.documentUrls.length > 0 ? parsed.data.documentUrls : null,
  }).returning();

  try {
    await sendEmail({
      to: parsed.data.guardianEmail,
      subject: 'Application Received — EduNexus',
      html: applicationConfirmationEmail({
        guardianName: parsed.data.guardianName,
        studentName: `${parsed.data.firstName} ${parsed.data.lastName}`,
      }),
    });
  } catch {
    console.error('[APPLICANT] Failed to send confirmation email for', applicant.id);
  }

  return apiSuccess({ id: applicant.id, status: applicant.status });
}

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const schoolId = request.headers.get('x-tenant-id');
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const gradeLevelId = searchParams.get('gradeLevelId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  const conditions = [eq(applicants.schoolId, schoolId)];
  if (status) conditions.push(eq(applicants.status, status));
  if (gradeLevelId) conditions.push(eq(applicants.gradeLevelId, gradeLevelId));

  const [totalResult] = await db.select({ count: count() }).from(applicants).where(and(...conditions));
  const total = Number(totalResult.count);

  const rows = await db.select()
    .from(applicants)
    .where(and(...conditions))
    .orderBy(desc(applicants.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(rows, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
```

- [x] **Step 2: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```
Expected: compiles without type errors.

- [x] **Step 3: Commit**

```bash
git add apps/web/app/api/applicants/route.ts
git commit -m "feat: add POST (public) and GET (admin) applicants API routes"
```

---

### Task 3: Admin detail + status change route

**Files:**
- Create: `apps/web/app/api/applicants/[id]/route.ts`

- [x] **Step 1: Create the route file**

Write `apps/web/app/api/applicants/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { applicants, auditLogs } from '@edunexus/database/src/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const validTransitions: Record<string, string[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['accepted', 'rejected', 'waitlisted'],
  waitlisted: ['accepted', 'rejected'],
};

const updateStatusSchema = z.object({
  status: z.enum(['under_review', 'accepted', 'rejected', 'waitlisted']),
  adminNotes: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const schoolId = request.headers.get('x-tenant-id');
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [applicant] = await db.select().from(applicants).where(and(
    eq(applicants.id, id),
    eq(applicants.schoolId, schoolId),
  )).limit(1);

  if (!applicant) return apiError(404, 'Applicant not found');
  return apiSuccess(applicant);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error: authError, user } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const schoolId = request.headers.get('x-tenant-id');
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [existing] = await db.select().from(applicants).where(and(
    eq(applicants.id, id),
    eq(applicants.schoolId, schoolId),
  )).limit(1);
  if (!existing) return apiError(404, 'Applicant not found');

  const body = await request.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const allowed = validTransitions[existing.status];
  if (!allowed || !allowed.includes(parsed.data.status)) {
    return apiError(422, `Cannot transition from '${existing.status}' to '${parsed.data.status}'`);
  }

  const [updated] = await db.update(applicants)
    .set({
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes !== undefined ? parsed.data.adminNotes : existing.adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(applicants.id, id))
    .returning();

  await db.insert(auditLogs).values({
    schoolId,
    userId: user!.id,
    action: 'applicant.status_changed',
    tableName: 'applicants',
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: parsed.data.status },
  });

  return apiSuccess(updated);
}
```

- [x] **Step 2: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```
Expected: compiles without type errors.

- [x] **Step 3: Commit**

```bash
git add apps/web/app/api/applicants/\[id\]/route.ts
git commit -m "feat: add GET (detail) and PATCH (status change) applicants API routes"
```

---

### Task 4: Confirmation email template

**Files:**
- Create: `apps/web/services/email/templates/application-confirmation.ts`

- [x] **Step 1: Create the email template**

Write `apps/web/services/email/templates/application-confirmation.ts`:

```typescript
interface ApplicationConfirmationParams {
  guardianName: string;
  studentName: string;
}

export function applicationConfirmationEmail({ guardianName, studentName }: ApplicationConfirmationParams): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">EduNexus</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear ${guardianName},</p>
        <p>Thank you for submitting an application for <strong>${studentName}</strong>.</p>
        <p>Your application has been received and is now under review. You will be notified once a decision has been made.</p>
        <p>If you have any questions, please contact the school directly.</p>
        <p>Best regards,<br/>The EduNexus Team</p>
      </div>
    </div>
  `;
}
```

- [x] **Step 2: Commit**

```bash
git add apps/web/services/email/templates/application-confirmation.ts
git commit -m "feat: add application confirmation email template"
```

---

### Task 5: Public form page at `/apply`

**Files:**
- Create: `apps/web/app/apply/page.tsx`
- Create: `apps/web/components/apply/application-form.tsx`

- [x] **Step 1: Create the Server Component page**

Write `apps/web/app/apply/page.tsx`:

```tsx
import { db } from '@/lib/db';
import { gradeLevels } from '@edunexus/database/src/schema';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import { ApplicationForm } from '@/components/apply/application-form';

export const dynamic = 'force-dynamic';

export default async function ApplyPage() {
  const headersList = await headers();
  const schoolId = headersList.get('x-tenant-id');

  if (!schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">School not found. Please check the URL.</p>
      </div>
    );
  }

  const grades = await db.select()
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, schoolId))
    .orderBy(gradeLevels.sortOrder);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Apply for Admission</h1>
          <p className="mt-2 text-muted-foreground">
            Complete the form below to submit your child&apos;s application.
          </p>
        </div>
        <ApplicationForm grades={grades} />
      </div>
    </div>
  );
}
```

- [x] **Step 2: Create the client form component**

Write `apps/web/components/apply/application-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  dateOfBirth: z.string().min(1, 'Date of birth is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  guardianName: z.string().min(1, 'Guardian name is required').max(200),
  guardianEmail: z.string().email('Valid email is required'),
  guardianPhone: z.string().optional(),
  guardianAddress: z.string().optional(),
  gradeLevelId: z.string().min(1, 'Grade level is required'),
  previousSchool: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GradeLevel {
  id: string;
  code: string;
  name: string;
  level: number;
  category: string;
}

interface ApplicationFormProps {
  grades: GradeLevel[];
}

export function ApplicationForm({ grades }: ApplicationFormProps) {
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary not configured');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setDocumentUrls(prev => [...prev, data.secure_url]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (url: string) => {
    setDocumentUrls(prev => prev.filter(u => u !== url));
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitState('submitting');
    setServerError('');

    try {
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, documentUrls }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Submission failed');
        setSubmitState('error');
        return;
      }

      setSubmitState('success');
    } catch {
      setServerError('Network error. Please try again.');
      setSubmitState('error');
    }
  };

  if (submitState === 'success') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h2 className="text-xl font-semibold">Application Submitted</h2>
          <p className="mt-2 text-muted-foreground">
            Thank you! Your application has been received. A confirmation email will be sent to your provided email address.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input id="dateOfBirth" placeholder="YYYY-MM-DD" {...register('dateOfBirth')} />
              {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <select
                id="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('gender')}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradeLevelId">Applying for Grade *</Label>
            <select
              id="gradeLevelId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('gradeLevelId')}
            >
              <option value="">Select grade</option>
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
            {errors.gradeLevelId && <p className="text-sm text-destructive">{errors.gradeLevelId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="previousSchool">Previous School</Label>
            <Input id="previousSchool" {...register('previousSchool')} />
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Guardian Information</CardTitle>
          </CardHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guardianName">Full Name *</Label>
              <Input id="guardianName" {...register('guardianName')} />
              {errors.guardianName && <p className="text-sm text-destructive">{errors.guardianName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianEmail">Email *</Label>
              <Input id="guardianEmail" type="email" {...register('guardianEmail')} />
              {errors.guardianEmail && <p className="text-sm text-destructive">{errors.guardianEmail.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guardianPhone">Phone</Label>
              <Input id="guardianPhone" {...register('guardianPhone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianAddress">Address</Label>
              <Input id="guardianAddress" {...register('guardianAddress')} />
            </div>
          </div>

          <CardHeader className="px-0 pt-4">
            <CardTitle>Documents</CardTitle>
          </CardHeader>

          <div className="space-y-2">
            <Label htmlFor="documents">Upload documents (birth certificate, report card)</Label>
            <Input
              id="documents"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            {documentUrls.length > 0 && (
              <ul className="mt-2 space-y-1">
                {documentUrls.map((url) => (
                  <li key={url} className="flex items-center justify-between rounded-md bg-muted px-3 py-1 text-sm">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      {url.split('/').pop()}
                    </a>
                    <button type="button" onClick={() => removeDocument(url)} className="text-destructive hover:underline">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitState === 'submitting'}>
            {submitState === 'submitting' ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [x] **Step 3: Build to typecheck**

```bash
cd apps/web && npx next build 2>&1 | tail -30
```
Expected: compiles without type errors.

- [x] **Step 4: Commit**

```bash
git add apps/web/app/apply/page.tsx apps/web/components/apply/application-form.tsx
git commit -m "feat: add public application form at /apply"
```

---

### Task 6: Full build verification

- [x] **Step 1: Run full build**

```bash
pnpm build
```
Expected: all 3 packages compile, TypeScript passes, all routes listed (including the new `/apply` page and `/api/applicants` routes).

- [x] **Step 2: Commit any final fixes**

```bash
git add -A
git commit -m "chore: fix build issues"
```

- [x] **Step 3: Push feature branch**

```bash
git push origin feature/3a.1.1-applicants-schema
```
