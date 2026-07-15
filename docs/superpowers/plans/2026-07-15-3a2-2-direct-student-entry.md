# [3a.2.2] Direct Student Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two direct student entry paths (manual single-entry form + bulk CSV import) so schools can onboard students without going through the applicant pipeline.

**Architecture:** A shared `createStudentFromData()` service handles the atomic transaction (student → enrollment → guardian → studentGuardian → profile) used by both the manual `POST /api/students` endpoint and the CSV import executor. The CSV import uses a three-step preview→validate→execute pattern with server-side per-row validation.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM, Zod, react-hook-form, shadcn/ui Nova, papaparse (CSV parsing on client), Vitest

## Global Constraints

- `requireRole('admin')` on all API endpoints
- `resolveTenant(host)` → `schoolId` on all API endpoints
- All monetary values stored as `numeric` in GHS
- All dates stored as ISO 8601 UTC, displayed in `en-GH` locale
- Use `cn()` from `@/lib/utils` for conditional class names
- Use `Controller` + shadcn/ui Nova primitives, NOT `FormField`/`FormItem`
- Always pass `items` prop on `<Select>` when options have UUID values
- Import cross-package as `@edunexus/database` and `@edunexus/shared`
- DB access only in API route handlers / Server Components — never in client components
- Audit logging on all write operations

---

## File Map

| Path | Purpose |
|---|---|
| `apps/web/services/student-creation.ts` | **Shared service** — `createStudentFromData()` does the atomic transaction |
| `apps/web/app/api/students/route.ts` | `POST /api/students` — manual entry handler |
| `apps/web/components/admin/students/create-student-form.tsx` | Manual entry form (client component) |
| `apps/web/app/(school)/admin/students/new/page.tsx` | Manual entry page (server component) |
| `apps/web/app/api/students/import/preview/route.ts` | `POST .../import/preview` — parse CSV headers + sample rows |
| `apps/web/app/api/students/import/validate/route.ts` | `POST .../import/validate` — validate all rows against schema |
| `apps/web/app/api/students/import/execute/route.ts` | `POST .../import/execute` — import valid rows atomically |
| `apps/web/components/admin/students/student-import-wizard.tsx` | Import stepper (client component) |
| `apps/web/app/(school)/admin/students/import/page.tsx` | Import page (server component) |
| `apps/web/services/student-id.ts` | Student ID generation (from [3a.2.1]) |
| `apps/web/services/csv-parser.ts` | CSV parsing + auto-mapping utility |
| `apps/web/tests/app/api/students/direct-entry.test.ts` | Integration tests for manual entry |
| `apps/web/tests/app/api/students/bulk-import.test.ts` | Integration tests for CSV import |

---

### Task 1: Shared student creation service

**Files:**
- Create: `apps/web/services/student-creation.ts`
- Depends on: `apps/web/services/student-id.ts` (from [3a.2.1])
- Test: `apps/web/tests/services/student-creation.test.ts`

**Interfaces:**
- Consumes: `generateStudentId(db, schoolId): Promise<string>`, `db.transaction()`, `scryptSync`, `randomBytes` from `crypto`
- Produces: `createStudentFromData(params): Promise<StudentCreationResult>`

```typescript
interface StudentCreationParams {
  schoolId: string;
  academicYearId: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
}

interface StudentCreationResult {
  student: { id: string; studentIdNumber: string; firstName: string; lastName: string };
  enrollment: { id: string };
  guardian: { id: string };
  credentials: { student: { email: string | null; password: string } };
}
```

- [ ] **Step 1: Create test file with failing tests**

Create `apps/web/tests/services/student-creation.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

const mockDb = {
  transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockTx)),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/services/student-id', () => ({ generateStudentId: vi.fn().mockResolvedValue('AABS20260001') }));
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('00000000000000000000000000000000', 'hex')),
  scryptSync: vi.fn(() => Buffer.from('a'.repeat(64))),
}));

const { createStudentFromData } = await import('@/services/student-creation');

describe('createStudentFromData', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates student, enrollment, guardian, studentGuardian, and profile in a transaction', async () => {
    mockTx.limit.mockResolvedValueOnce([]);
    const returning = mockTx.returning;
    returning
      .mockResolvedValueOnce([{ id: 'student-1', studentIdNumber: 'AABS20260001', firstName: 'John', lastName: 'Doe' }])
      .mockResolvedValueOnce([{ id: 'enrollment-1', classId: 'class-1', academicYearId: 'year-1' }])
      .mockResolvedValueOnce([{ id: 'guardian-1', firstName: 'Jane', lastName: 'Doe', phone: '0205516734' }])
      .mockResolvedValueOnce([{ id: 'sg-1' }])
      .mockResolvedValueOnce([{ id: 'profile-1', email: 'john@school.com' }]);

    const result = await createStudentFromData({
      schoolId: 'school-1',
      academicYearId: 'year-1',
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      dateOfBirth: '2015-06-01',
      classId: 'class-1',
      guardianName: 'Jane Doe',
      guardianPhone: '0205516734',
    });

    expect(result.student.studentIdNumber).toBe('AABS20260001');
    expect(result.enrollment.id).toBe('enrollment-1');
    expect(result.guardian.id).toBe('guardian-1');
    expect(result.credentials.student.email).toBe('john@school.com');
  });
});
```

Run: `pnpm --filter web exec vitest run tests/services/student-creation.test.ts`
Expected: FAIL — module not found

- [ ] **Step 2: Write minimal implementation**

Create `apps/web/services/student-creation.ts`:
```typescript
import { db } from '@/lib/db';
import { students, enrollments, guardians, studentGuardians, profiles } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { generateStudentId } from '@/services/student-id';
import { scryptSync, randomBytes } from 'crypto';

export interface StudentCreationParams {
  schoolId: string;
  academicYearId: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
}

export interface StudentCreationResult {
  student: { id: string; studentIdNumber: string; firstName: string; lastName: string };
  enrollment: { id: string };
  guardian: { id: string };
  credentials: { student: { email: string | null; password: string } };
}

export async function createStudentFromData(params: StudentCreationParams): Promise<StudentCreationResult> {
  return db.transaction(async (tx) => {
    const studentIdNumber = await generateStudentId(tx as any, params.schoolId);

    const [student] = await tx.insert(students).values({
      schoolId: params.schoolId,
      studentIdNumber,
      firstName: params.firstName,
      lastName: params.lastName,
      gender: params.gender,
      dateOfBirth: params.dateOfBirth,
      enrollmentDate: new Date().toISOString().split('T')[0],
      status: 'active',
    }).returning();

    const [enrollment] = await tx.insert(enrollments).values({
      schoolId: params.schoolId,
      studentId: student.id,
      classId: params.classId,
      academicYearId: params.academicYearId,
      status: 'active',
      enrollmentDate: new Date(),
    }).returning();

    const nameParts = params.guardianName.trim().split(/\s+/);
    const guardianFirstName = nameParts[0] || params.guardianName;
    const guardianLastName = nameParts.slice(1).join(' ') || '';

    const [guardian] = await tx.insert(guardians).values({
      schoolId: params.schoolId,
      firstName: guardianFirstName,
      lastName: guardianLastName,
      relationship: 'parent',
      phone: params.guardianPhone,
      isPrimary: true,
    }).returning();

    await tx.insert(studentGuardians).values({
      studentId: student.id,
      guardianId: guardian.id,
      relationship: 'parent',
      isEmergency: false,
    });

    const studentEmail = `${studentIdNumber.toLowerCase()}@edunexus.com`;
    const salt = randomBytes(32).toString('hex');
    const hash = scryptSync('password123', salt, 64).toString('hex');
    const passwordHash = `scrypt:${salt}:${hash}`;

    const [profile] = await tx.insert(profiles).values({
      schoolId: params.schoolId,
      email: studentEmail,
      passwordHash,
      role: 'student',
      firstName: params.firstName,
      lastName: params.lastName,
      isActive: true,
    }).onConflictDoNothing().returning();

    return {
      student: { id: student.id, studentIdNumber, firstName: student.firstName, lastName: student.lastName },
      enrollment: { id: enrollment.id },
      guardian: { id: guardian.id },
      credentials: {
        student: { email: profile?.email ?? null, password: 'password123' },
      },
    };
  });
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run tests/services/student-creation.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/student-creation.ts apps/web/tests/services/student-creation.test.ts
git commit -m "feat(3a.2.2): add shared student creation service"
```

---

### Task 2: POST /api/students — manual entry endpoint

**Files:**
- Create: `apps/web/app/api/students/route.ts`
- Test: `apps/web/tests/app/api/students/direct-entry.test.ts`

**Interfaces:**
- Consumes: `createStudentFromData(params)`, `requireRole('admin')`, `resolveTenant(host)`, `db.select()` to resolve academic year and class
- Produces: `POST /api/students` → `StudentCreationResult`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/app/api/students/direct-entry.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/services/student-creation', () => ({
  createStudentFromData: vi.fn().mockResolvedValue({
    student: { id: 'student-1', studentIdNumber: 'AABS20260001', firstName: 'John', lastName: 'Doe' },
    enrollment: { id: 'enrollment-1' },
    guardian: { id: 'guardian-1' },
    credentials: { student: { email: 'student@school.com', password: 'password123' } },
  }),
}));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null, user: { id: 'admin-1', role: 'admin' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));

const { POST } = await import('@/app/api/students/route');

describe('POST /api/students', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a student with valid data', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 'year-1', isCurrent: true, schoolId: 'school-1' }])
      .mockResolvedValueOnce([{ id: 'class-1', schoolId: 'school-1', gradeLevelId: 'grade-1' }]);

    const res = await POST(new Request('http://localhost:3000/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({
        firstName: 'John', lastName: 'Doe', gender: 'male', dateOfBirth: '2015-06-01',
        classId: 'class-1', guardianName: 'Jane Doe', guardianPhone: '0205516734',
      }),
    }) as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.student.studentIdNumber).toBe('AABS20260001');
  });

  it('returns 422 for missing fields', async () => {
    const res = await POST(new Request('http://localhost:3000/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({ firstName: 'John' }),
    }) as any);

    expect(res.status).toBe(422);
  });

  it('returns 404 if class not found', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 'year-1', isCurrent: true, schoolId: 'school-1' }])
      .mockResolvedValueOnce([]);

    const res = await POST(new Request('http://localhost:3000/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({
        firstName: 'John', lastName: 'Doe', gender: 'male', dateOfBirth: '2015-06-01',
        classId: 'class-1', guardianName: 'Jane Doe', guardianPhone: '0205516734',
      }),
    }) as any);

    expect(res.status).toBe(404);
  });
});
```

Run: `pnpm --filter web exec vitest run tests/app/api/students/direct-entry.test.ts`
Expected: FAIL — module not found

- [ ] **Step 2: Write minimal implementation**

Create `apps/web/app/api/students/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { classes, academicYears } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { createStudentFromData } from '@/services/student-creation';

const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  classId: z.string().uuid('Class is required'),
  guardianName: z.string().min(1, 'Guardian name is required').max(200),
  guardianPhone: z.string().min(1, 'Guardian phone is required').max(20),
});

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json();
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [academicYear] = await db.select()
    .from(academicYears)
    .where(and(
      eq(academicYears.schoolId, schoolId),
      eq(academicYears.isCurrent, true),
    ))
    .limit(1);
  if (!academicYear) return apiError(500, 'No current academic year configured');

  const [targetClass] = await db.select()
    .from(classes)
    .where(and(
      eq(classes.id, parsed.data.classId),
      eq(classes.schoolId, schoolId),
    ))
    .limit(1);
  if (!targetClass) return apiError(404, 'Class not found');

  const result = await createStudentFromData({
    schoolId,
    academicYearId: academicYear.id,
    ...parsed.data,
  });

  return apiSuccess(result);
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run tests/app/api/students/direct-entry.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/students/route.ts apps/web/tests/app/api/students/direct-entry.test.ts
git commit -m "feat(3a.2.2): add POST /api/students manual entry endpoint"
```

---

### Task 3: Manual entry form UI

**Files:**
- Create: `apps/web/components/admin/students/create-student-form.tsx`
- Create: `apps/web/app/(school)/admin/students/new/page.tsx`

**Skills:** Load `skill:frontend-design` and `skill:next-best-practices` for UI implementation.

- [ ] **Step 1: Create the server page**

Create `apps/web/app/(school)/admin/students/new/page.tsx`:
```typescript
import { db } from '@/lib/db';
import { classes, academicYears, gradeLevels } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { CreateStudentForm } from '@/components/admin/students/create-student-form';

export const dynamic = 'force-dynamic';

export default async function NewStudentPage() {
  const session = await requireRole('admin', 'super_admin');

  const allClasses = await db.select({
    id: classes.id, name: classes.name, code: classes.code,
    capacity: classes.capacity, gradeLevelId: classes.gradeLevelId,
  }).from(classes)
    .where(eq(classes.schoolId, session.user.schoolId!))
    .orderBy(classes.name);

  const gradeList = await db.select({
    id: gradeLevels.id, name: gradeLevels.name, code: gradeLevels.code,
  }).from(gradeLevels)
    .where(eq(gradeLevels.schoolId, session.user.schoolId!))
    .orderBy(gradeLevels.sortOrder);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add New Student</h1>
        <p className="text-sm text-muted-foreground">
          Create a student record directly without going through the applicant pipeline.
        </p>
      </div>
      <CreateStudentForm classes={allClasses} grades={gradeList} />
    </div>
  );
}
```

- [ ] **Step 2: Create the client form**

Create `apps/web/components/admin/students/create-student-form.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  dateOfBirth: z.string().min(1, 'Date of birth is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  classId: z.string().min(1, 'Class is required'),
  guardianName: z.string().min(1, 'Guardian name is required').max(200),
  guardianPhone: z.string().min(1, 'Guardian phone is required').max(20),
});

type FormValues = z.infer<typeof formSchema>;

interface ClassOption {
  id: string; name: string; code: string | null; gradeLevelId: string;
}

interface GradeOption {
  id: string; name: string; code: string;
}

interface Props {
  classes: ClassOption[];
  grades: GradeOption[];
}

export function CreateStudentForm({ classes, grades }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState<{ studentIdNumber: string; firstName: string; lastName: string; email: string | null; password: string } | null>(null);

  const { handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '', lastName: '', gender: undefined as any, dateOfBirth: '', classId: '', guardianName: '', guardianPhone: '',
    },
  });

  const [selectedGradeId, setSelectedGradeId] = useState('');

  const filteredClasses = selectedGradeId
    ? classes.filter(c => c.gradeLevelId === selectedGradeId)
    : classes;

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setServerError(json.error ?? 'Failed to create student'); return; }
      setResult(json.data);
    } catch { setServerError('Network error'); }
    finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
          <h2 className="text-xl font-semibold">Student Created</h2>
          <div className="rounded-lg border bg-muted/30 p-4 text-left space-y-1">
            <p className="font-medium">{result.firstName} {result.lastName}</p>
            <p className="text-sm text-muted-foreground">ID: {result.studentIdNumber}</p>
          </div>
          {result.email && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left space-y-1">
              <p className="text-sm font-semibold text-amber-800">Student Login</p>
              <p className="text-sm text-amber-700">Email: {result.email}</p>
              <p className="text-sm text-amber-700">Password: <code className="bg-amber-100 px-1 rounded">{result.password}</code></p>
            </div>
          )}
          <Button onClick={() => setResult(null)}>Add Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller name="firstName" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>First Name *</Label>
                <Input id={field.name} {...field} />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>
            )} />
            <Controller name="lastName" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Last Name *</Label>
                <Input id={field.name} {...field} />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>
            )} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller name="gender" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Gender *</Label>
                <Select onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
              </div>
            )} />
            <Controller name="dateOfBirth" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Date of Birth *</Label>
                <Input id={field.name} type="date" {...field} />
                {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>}
              </div>
            )} />
          </div>

          <div className="space-y-2">
            <Label>Grade Level</Label>
            <Select value={selectedGradeId} onValueChange={setSelectedGradeId}
              items={grades.map(g => ({ value: g.id, label: `${g.name} (${g.code})` }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({g.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Controller name="classId" control={control} render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Class *</Label>
              <Select value={field.value} onValueChange={field.onChange}
                items={filteredClasses.map(c => ({ value: c.id, label: `${c.name}${c.code ? ` (${c.code})` : ''}` }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder={selectedGradeId ? 'Select a class' : 'Select a grade first'} /></SelectTrigger>
                <SelectContent>
                  {filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.classId && <p className="text-sm text-destructive">{errors.classId.message}</p>}
            </div>
          )} />

          <CardHeader className="px-0 pt-4"><CardTitle>Guardian Information</CardTitle></CardHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller name="guardianName" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Guardian Name *</Label>
                <Input id={field.name} {...field} />
                {errors.guardianName && <p className="text-sm text-destructive">{errors.guardianName.message}</p>}
              </div>
            )} />
            <Controller name="guardianPhone" control={control} render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Guardian Phone *</Label>
                <Input id={field.name} type="tel" {...field} />
                {errors.guardianPhone && <p className="text-sm text-destructive">{errors.guardianPhone.message}</p>}
              </div>
            )} />
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Student'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Load frontend skills and polish**

Load `skill:frontend-design` and `skill:next-best-practices` to review and polish the form component.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter web exec vitest run tests/app/api/students/direct-entry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/students/create-student-form.tsx apps/web/app/\(school\)/admin/students/new/page.tsx
git commit -m "feat(3a.2.2): add manual student entry form UI"
```

---

### Task 4: CSV utility — parser + auto-mapper

**Files:**
- Create: `apps/web/services/csv-parser.ts`
- Test: `apps/web/tests/services/csv-parser.test.ts`

**Interfaces:**
- Consumes: raw CSV text
- Produces: `parseCSV(text): { headers: string[], rows: Record<string, string>[] }`, `autoMapHeaders(headers): Record<string, string>`

- [ ] **Step 1: Write test**

Create `apps/web/tests/services/csv-parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseCSV, autoMapHeaders } from '@/services/csv-parser';

describe('parseCSV', () => {
  it('parses CSV with headers and rows', () => {
    const csv = 'firstName,lastName,gender\nJohn,Doe,male\nJane,Smith,female';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['firstName', 'lastName', 'gender']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].firstName).toBe('John');
  });

  it('handles quoted fields with commas', () => {
    const csv = 'name,note\n"John, Doe","hello, world"';
    const result = parseCSV(csv);
    expect(result.rows[0].name).toBe('John, Doe');
  });
});

describe('autoMapHeaders', () => {
  it('maps common header variations', () => {
    const map = autoMapHeaders(['First Name', 'Last Name', 'DOB', 'Sex', 'Class', 'Parent/Guardian', 'Phone']);
    expect(map['First Name']).toBe('firstName');
    expect(map['Last Name']).toBe('lastName');
    expect(map.DOB).toBe('dateOfBirth');
    expect(map.Sex).toBe('gender');
    expect(map.Class).toBe('classCode');
    expect(map['Parent/Guardian']).toBe('guardianName');
    expect(map.Phone).toBe('guardianPhone');
  });

  it('returns null for unknown headers', () => {
    const map = autoMapHeaders(['Unknown Column']);
    expect(map['Unknown Column']).toBeNull();
  });
});
```

Run: `pnpm --filter web exec vitest run tests/services/csv-parser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 2: Write minimal implementation**

Create `apps/web/services/csv-parser.ts`:
```typescript
const HEADER_ALIASES: Record<string, string> = {
  'first name': 'firstName',
  'first_name': 'firstName',
  'firstname': 'firstName',
  'given name': 'firstName',
  'last name': 'lastName',
  'last_name': 'lastName',
  'lastname': 'lastName',
  'surname': 'lastName',
  'family name': 'lastName',
  'gender': 'gender',
  'sex': 'gender',
  'date of birth': 'dateOfBirth',
  'date_of_birth': 'dateOfBirth',
  'dob': 'dateOfBirth',
  'birth date': 'dateOfBirth',
  'class code': 'classCode',
  'class_code': 'classCode',
  'class': 'classCode',
  'guardian name': 'guardianName',
  'guardian_name': 'guardianName',
  'parent name': 'guardianName',
  'parent/guardian': 'guardianName',
  'guardian phone': 'guardianPhone',
  'guardian_phone': 'guardianPhone',
  'parent phone': 'guardianPhone',
  'phone': 'guardianPhone',
};

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });

  return { headers, rows };
}

export function autoMapHeaders(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  for (const header of headers) {
    const key = header.trim().toLowerCase();
    mapping[header] = HEADER_ALIASES[key] ?? null;
  }
  return mapping;
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run tests/services/csv-parser.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/csv-parser.ts apps/web/tests/services/csv-parser.test.ts
git commit -m "feat(3a.2.2): add CSV parser and auto-header mapper"
```

---

### Task 5: CSV import API endpoints

**Files:**
- Create: `apps/web/app/api/students/import/preview/route.ts`
- Create: `apps/web/app/api/students/import/validate/route.ts`
- Create: `apps/web/app/api/students/import/execute/route.ts`
- Test: `apps/web/tests/app/api/students/bulk-import.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/app/api/students/bulk-import.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
};
const mockCreateStudent = vi.fn().mockResolvedValue({
  student: { id: 'student-1', studentIdNumber: 'AABS20260001', firstName: 'John', lastName: 'Doe' },
  enrollment: { id: 'enrollment-1' },
  guardian: { id: 'guardian-1' },
  credentials: { student: { email: 's@e.com', password: 'pw' } },
});

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/services/student-creation', () => ({ createStudentFromData: mockCreateStudent }));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null, user: { id: 'admin-1', role: 'admin' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));

describe('POST /api/students/import', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('preview returns headers and mapping', async () => {
    const { POST } = await import('@/app/api/students/import/preview/route');
    const res = await POST(new Request('http://localhost:3000/api/students/import/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: 'firstName,lastName\nJohn,Doe' }),
    }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.headers).toContain('firstName');
  });

  it('validate returns per-row errors', async () => {
    const { POST } = await import('@/app/api/students/import/validate/route');
    const res = await POST(new Request('http://localhost:3000/api/students/import/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv: 'firstName,lastName\nJohn,Doe\n,Smith',
        mapping: { firstName: 'firstName', lastName: 'lastName' },
      }),
    }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.valid).toBeLessThan(body.data.total);
  });

  it('execute imports valid rows and reports skipped', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 'year-1', isCurrent: true, schoolId: 'school-1' }])
      .mockResolvedValueOnce([{ id: 'class-1', gradeLevelId: 'g-1', schoolId: 'school-1' }]);

    const { POST } = await import('@/app/api/students/import/execute/route');
    const res = await POST(new Request('http://localhost:3000/api/students/import/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv: 'firstName,lastName,gender,dateOfBirth,classCode,guardianName,guardianPhone\nJohn,Doe,male,2015-01-01,class-1,Jane Doe,0205516734\n,Smith,male,2015-01-01,class-1,Jane Doe,0205516734',
        mapping: { firstName: 'firstName', lastName: 'lastName', gender: 'gender', dateOfBirth: 'dateOfBirth', classCode: 'classCode', guardianName: 'guardianName', guardianPhone: 'guardianPhone' },
      }),
    }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.failed).toBe(1);
  });
});
```

Run: `pnpm --filter web exec vitest run tests/app/api/students/bulk-import.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 2: Create preview endpoint**

Create `apps/web/app/api/students/import/preview/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { parseCSV, autoMapHeaders } from '@/services/csv-parser';

const previewSchema = z.object({
  csv: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) return apiError(422, 'Invalid CSV data');

  const { headers, rows } = parseCSV(parsed.data.csv);
  if (headers.length === 0) return apiError(422, 'CSV must have a header row and at least one data row');

  const suggestedMapping = autoMapHeaders(headers);
  const sampleRows = rows.slice(0, 10);

  return apiSuccess({ headers, suggestedMapping, sampleRows, totalRows: rows.length });
}
```

- [ ] **Step 3: Create validate endpoint**

Create `apps/web/app/api/students/import/validate/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { parseCSV } from '@/services/csv-parser';

const validateSchema = z.object({
  csv: z.string().min(1),
  mapping: z.record(z.string(), z.string()),
});

const rowSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female'], { message: 'Must be male or female' }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  classCode: z.string().min(1, 'Required'),
  guardianName: z.string().min(1, 'Required'),
  guardianPhone: z.string().min(1, 'Required').max(20),
});

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) return apiError(422, 'Invalid request');

  const { rows } = parseCSV(parsed.data.csv);
  const mapping = parsed.data.mapping;

  const results = rows.map((row, i) => {
    const mapped: Record<string, string> = {};
    for (const [csvHeader, fieldName] of Object.entries(mapping)) {
      if (fieldName) mapped[fieldName] = row[csvHeader] ?? '';
    }

    const validation = rowSchema.safeParse(mapped);
    return {
      rowNumber: i + 2,
      firstName: mapped.firstName ?? '',
      valid: validation.success,
      errors: validation.success ? null : validation.error.flatten().fieldErrors,
    };
  });

  const valid = results.filter(r => r.valid).length;
  const invalid = results.filter(r => !r.valid).length;

  return apiSuccess({ total: rows.length, valid, invalid, rows: results });
}
```

- [ ] **Step 4: Create execute endpoint**

Create `apps/web/app/api/students/import/execute/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { classes, academicYears } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { parseCSV } from '@/services/csv-parser';
import { createStudentFromData } from '@/services/student-creation';

const executeSchema = z.object({
  csv: z.string().min(1),
  mapping: z.record(z.string(), z.string()),
});

const rowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  classCode: z.string().min(1),
  guardianName: z.string().min(1),
  guardianPhone: z.string().min(1).max(20),
});

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json();
  const parsed = executeSchema.safeParse(body);
  if (!parsed.success) return apiError(422, 'Invalid request');

  const { rows } = parseCSV(parsed.data.csv);
  const mapping = parsed.data.mapping;

  const [academicYear] = await db.select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1);
  if (!academicYear) return apiError(500, 'No current academic year configured');

  const allClasses = await db.select()
    .from(classes)
    .where(eq(classes.schoolId, schoolId));

  const results: Array<{ rowNumber: number; status: 'imported' | 'failed'; studentId?: string; error?: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const mapped: Record<string, string> = {};
    for (const [csvHeader, fieldName] of Object.entries(mapping)) {
      if (fieldName) mapped[fieldName] = rows[i][csvHeader] ?? '';
    }

    const validation = rowSchema.safeParse(mapped);
    if (!validation.success) {
      const msgs = Object.values(validation.error.flatten().fieldErrors).flat().join('; ');
      results.push({ rowNumber: i + 2, status: 'failed', error: msgs });
      continue;
    }

    const targetClass = allClasses.find(c => c.code === validation.data.classCode || c.id === validation.data.classCode);
    if (!targetClass) {
      results.push({ rowNumber: i + 2, status: 'failed', error: `Class '${validation.data.classCode}' not found` });
      continue;
    }

    try {
      const result = await createStudentFromData({
        schoolId,
        academicYearId: academicYear.id,
        ...validation.data,
        classId: targetClass.id,
      });
      results.push({ rowNumber: i + 2, status: 'imported', studentId: result.student.studentIdNumber });
    } catch (err: any) {
      results.push({ rowNumber: i + 2, status: 'failed', error: err.message ?? 'Unknown error' });
    }
  }

  const imported = results.filter(r => r.status === 'imported').length;
  const failed = results.filter(r => r.status === 'failed').length;

  return apiSuccess({ imported, failed, total: rows.length, results });
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter web exec vitest run tests/app/api/students/bulk-import.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/students/import/
git commit -m "feat(3a.2.2): add CSV import preview/validate/execute endpoints"
```

---

### Task 6: CSV import wizard UI

**Files:**
- Create: `apps/web/components/admin/students/student-import-wizard.tsx`
- Create: `apps/web/app/(school)/admin/students/import/page.tsx`

**Skills:** Load `skill:frontend-design` and `skill:next-best-practices` for UI implementation.

- [ ] **Step 1: Create the server page**

Create `apps/web/app/(school)/admin/students/import/page.tsx`:
```typescript
import { requireRole } from '@/lib/auth/auth.guard';
import { StudentImportWizard } from '@/components/admin/students/student-import-wizard';

export const dynamic = 'force-dynamic';

export default async function ImportStudentsPage() {
  await requireRole('admin', 'super_admin');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Students</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to bulk-add students. Preview, map columns, validate, then import.
        </p>
      </div>
      <StudentImportWizard />
    </div>
  );
}
```

- [ ] **Step 2: Create the import wizard component**

Create `apps/web/components/admin/students/student-import-wizard.tsx`:
```typescript
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Upload, FileText, Download } from 'lucide-react';

type Step = 'upload' | 'mapping' | 'validation' | 'results';

const KNOWN_FIELDS = ['firstName', 'lastName', 'gender', 'dateOfBirth', 'classCode', 'guardianName', 'guardianPhone'];

export function StudentImportWizard() {
  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      setCsvText(text);
      const res = await fetch('/api/students/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Preview failed'); return; }
      setHeaders(json.data.headers);
      setSampleRows(json.data.sampleRows);
      setMapping(Object.fromEntries(json.data.headers.map((h: string) => [h, json.data.suggestedMapping[h] ?? ''])));
      setStep('mapping');
    } catch { setError('Failed to read file'); }
    finally { setLoading(false); }
  };

  const handleValidate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/students/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, mapping }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Validation failed'); return; }
      setValidationResult(json.data);
      setStep('validation');
    } catch { setError('Validation request failed'); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/students/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, mapping }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Import failed'); return; }
      setImportResult(json.data);
      setStep('results');
    } catch { setError('Import request failed'); }
    finally { setLoading(false); }
  };

  const downloadErrorReport = () => {
    if (!validationResult) return;
    const errors = validationResult.rows.filter((r: any) => !r.valid);
    const csvRows = [['Row', 'Name', 'Errors'].join(',')];
    errors.forEach((r: any) => {
      const errorStr = r.errors ? Object.values(r.errors).flat().join('; ') : '';
      csvRows.push([r.rowNumber, r.firstName, `"${errorStr}"`].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'import-errors.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'upload') {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Upload a CSV file with student data</p>
            <p className="text-xs text-muted-foreground mt-1">Headers: firstName, lastName, gender, dateOfBirth, classCode, guardianName, guardianPhone</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
            {loading ? 'Reading...' : 'Select CSV File'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (step === 'mapping') {
    return (
      <Card>
        <CardHeader><CardTitle>Map Columns</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Map CSV columns to student fields. Fields without a mapping will be skipped.
          </p>
          {headers.map(header => (
            <div key={header} className="flex items-center gap-3">
              <Label className="w-40 shrink-0 text-sm font-mono">{header}</Label>
              <Select value={mapping[header] ?? ''} onValueChange={v => setMapping(p => ({ ...p, [header]: v }))}
                items={KNOWN_FIELDS.map(f => ({ value: f, label: f }))}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Skip column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Skip column</SelectItem>
                  {KNOWN_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
          {sampleRows.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Preview (first {sampleRows.length} rows)</p>
              <div className="overflow-x-auto text-xs border rounded-md">
                <table className="w-full">
                  <thead><tr className="bg-muted">{headers.map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
                  <tbody>{sampleRows.map((row, i) => (
                    <tr key={i} className="border-t">{headers.map(h => <td key={h} className="p-2">{row[h]}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
            <Button onClick={handleValidate} disabled={loading}>{loading ? 'Validating...' : 'Validate'}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'validation') {
    return (
      <Card>
        <CardHeader><CardTitle>Validation Results</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex-1 text-center">
              <p className="text-2xl font-bold text-green-700">{validationResult?.valid ?? 0}</p>
              <p className="text-sm text-green-600">Valid</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex-1 text-center">
              <p className="text-2xl font-bold text-red-700">{validationResult?.invalid ?? 0}</p>
              <p className="text-sm text-red-600">Invalid</p>
            </div>
          </div>
          {validationResult?.invalid > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-700">Rows with errors</p>
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download className="h-3 w-3 mr-1" /> Error Report
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto text-sm border rounded-md">
                <table className="w-full">
                  <thead><tr className="bg-muted"><th className="p-2 text-left">Row</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Errors</th></tr></thead>
                  <tbody>{validationResult?.rows.filter((r: any) => !r.valid).map((r: any) => (
                    <tr key={r.rowNumber} className="border-t">
                      <td className="p-2">{r.rowNumber}</td>
                      <td className="p-2">{r.firstName}</td>
                      <td className="p-2 text-red-600">{r.errors ? Object.values(r.errors).flat().join('; ') : ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
            <Button onClick={handleImport} disabled={loading || (validationResult?.valid ?? 0) === 0}>
              {loading ? 'Importing...' : `Import ${validationResult?.valid ?? 0} Valid Students`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 text-center space-y-4">
        <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
        <h2 className="text-xl font-semibold">Import Complete</h2>
        <div className="flex gap-4 justify-center">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{importResult?.imported ?? 0}</p>
            <p className="text-sm text-green-600">Imported</p>
          </div>
          {importResult?.failed > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{importResult?.failed ?? 0}</p>
              <p className="text-sm text-red-600">Failed</p>
            </div>
          )}
        </div>
        {importResult?.failed > 0 && (
          <Button variant="outline" onClick={downloadErrorReport}>
            <Download className="h-4 w-4 mr-1" /> Download Error Report
          </Button>
        )}
        <Button onClick={() => { setStep('upload'); setCsvText(''); setValidationResult(null); setImportResult(null); }}>
          Import Another File
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Load frontend skills and polish**

Load `skill:frontend-design` and `skill:next-best-practices` to review and polish the wizard component.

- [ ] **Step 4: Run full test suite**

Run: `pnpm --filter web exec vitest run tests/app/api/students/`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/students/student-import-wizard.tsx apps/web/app/\(school\)/admin/students/import/page.tsx
git commit -m "feat(3a.2.2): add CSV import wizard UI"
```

---

### Task 7: Typecheck + lint + final verification

**Files:** No new files — verification pass only

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: No errors

- [ ] **Step 2: Run lint**

```bash
pnpm run --filter web lint
```
Expected: No warnings

- [ ] **Step 3: Run full test suite**

```bash
pnpm --filter web exec vitest run
```
Expected: 125+ tests pass (117 existing + new)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(3a.2.2): typecheck and lint fixes"
```
