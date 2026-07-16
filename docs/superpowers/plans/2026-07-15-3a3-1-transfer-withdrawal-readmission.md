# [3a.3.1] Transfer / Withdrawal / Re-admission — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Backend endpoints for student lifecycle events — withdraw, transfer (with PDF certificate), graduate, and re-admit.

**Architecture:** New columns on `enrollments` → shared lifecycle service with status validation → 5 API routes + jsPDF transfer certificate.

**Tech Stack:** Drizzle ORM, Next.js 16 App Router, jsPDF + jsPDF-AutoTable

---

### Task 1: Schema migration — add lifecycle columns

**Files:**
- Modify: `packages/database/src/schema/enrollments.ts`

- [ ] **Step 1: Add new columns to enrollments schema**

Edit `packages/database/src/schema/enrollments.ts` — add after `enrollmentDate` (line 16):

```typescript
  endDate: date('end_date'),
  transferReason: varchar('transfer_reason', { length: 255 }),
  transferSchoolName: varchar('transfer_school_name', { length: 200 }),
```

- [ ] **Step 2: Push migration**

```bash
cd C:\Projects\edunexus && pnpm db:migrate
```

- [ ] **Step 3: Commit**

```bash
git add packages/database/src/schema/enrollments.ts
git commit -m "feat(3a.3.1): add endDate, transferReason, transferSchoolName to enrollments"
```

---

### Task 2: Enrollment lifecycle service

**Files:**
- Create: `apps/web/services/enrollment-lifecycle.ts`
- Test: `apps/web/tests/services/enrollment-lifecycle.test.ts`

**Interfaces:**
- Produces: `updateEnrollmentStatus(params)` — shared by withdraw/transfer/graduate endpoints

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/services/enrollment-lifecycle.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const tx = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};
const mockDb = { transaction: vi.fn() };

vi.mock('@/lib/db', () => ({ db: mockDb }));

const { updateEnrollmentStatus } = await import('@/services/enrollment-lifecycle');

describe('updateEnrollmentStatus', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('transitions active to withdrawn', async () => {
    tx.limit
      .mockResolvedValueOnce([{ id: 'e1', status: 'active', studentId: 's1', schoolId: 'sch1' }])
      .mockResolvedValueOnce([]);
    tx.returning.mockResolvedValue([{ id: 'e1', status: 'withdrawn', endDate: '2026-07-15', transferReason: 'Family relocation', transferSchoolName: null }]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await updateEnrollmentStatus({ enrollmentId: 'e1', newStatus: 'withdrawn', reason: 'Family relocation' });

    expect(result.status).toBe('withdrawn');
    expect(result.endDate).toBe('2026-07-15');
  });

  it('rejects invalid transition (graduated → withdrawn)', async () => {
    tx.limit.mockResolvedValueOnce([{ id: 'e1', status: 'graduated', studentId: 's1', schoolId: 'sch1' }]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(updateEnrollmentStatus({ enrollmentId: 'e1', newStatus: 'withdrawn' }))
      .rejects.toThrow('Cannot transition enrollment from graduated to withdrawn');
  });

  it('throws 404 if enrollment not found', async () => {
    tx.limit.mockResolvedValueOnce([]);
    mockDb.transaction.mockImplementation(async (cb: any) => cb(tx));

    await expect(updateEnrollmentStatus({ enrollmentId: 'nonexistent', newStatus: 'withdrawn' }))
      .rejects.toThrow('Enrollment not found');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter web exec vitest run tests/services/enrollment-lifecycle.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/services/enrollment-lifecycle.ts`:

```typescript
import { db } from '@/lib/db';
import { enrollments, students } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';

export type EnrollmentStatus = 'active' | 'withdrawn' | 'transferred_out' | 'graduated';

interface UpdateEnrollmentStatusParams {
  enrollmentId: string;
  newStatus: EnrollmentStatus;
  reason?: string;
  targetSchoolName?: string;
}

interface EnrollmentLifecycleResult {
  id: string;
  status: string;
  endDate: string | null;
  transferReason: string | null;
  transferSchoolName: string | null;
}

const VALID_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  active: ['withdrawn', 'transferred_out', 'graduated'],
  withdrawn: [],
  transferred_out: [],
  graduated: [],
};

export async function updateEnrollmentStatus(params: UpdateEnrollmentStatusParams): Promise<EnrollmentLifecycleResult> {
  return db.transaction(async (tx) => {
    const [enrollment] = await tx.select()
      .from(enrollments)
      .where(eq(enrollments.id, params.enrollmentId))
      .limit(1);

    if (!enrollment) throw new Error('Enrollment not found');

    const allowedTransitions = VALID_TRANSITIONS[enrollment.status as EnrollmentStatus] ?? [];
    if (!allowedTransitions.includes(params.newStatus as EnrollmentStatus)) {
      throw new Error(`Cannot transition enrollment from ${enrollment.status} to ${params.newStatus}`);
    }

    const now = new Date().toISOString().split('T')[0];

    const [updated] = await tx.update(enrollments)
      .set({
        status: params.newStatus,
        endDate: now,
        transferReason: params.reason ?? null,
        transferSchoolName: params.targetSchoolName ?? null,
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, params.enrollmentId))
      .returning();

    const otherActive = await tx.select()
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, enrollment.studentId),
        eq(enrollments.status, 'active'),
      ))
      .limit(1);

    if (otherActive.length === 0) {
      await tx.update(students)
        .set({ status: params.newStatus, updatedAt: new Date() })
        .where(eq(students.id, enrollment.studentId));
    }

    return {
      id: updated.id,
      status: updated.status!,
      endDate: updated.endDate,
      transferReason: updated.transferReason,
      transferSchoolName: updated.transferSchoolName,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web exec vitest run tests/services/enrollment-lifecycle.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/services/enrollment-lifecycle.ts apps/web/tests/services/enrollment-lifecycle.test.ts
git commit -m "feat(3a.3.1): add enrollment lifecycle service"
```

---

### Task 3: Transfer certificate PDF service

**Files:**
- Create: `apps/web/services/transfer-certificate.ts`
- Test: `apps/web/tests/services/transfer-certificate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/services/transfer-certificate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

const { generateTransferCertificate } = await import('@/services/transfer-certificate');

describe('generateTransferCertificate', () => {
  it('generates a PDF buffer with student info', async () => {
    const result = await generateTransferCertificate({
      studentName: 'John Doe',
      studentIdNumber: 'AABS20260001',
      dateOfBirth: '2015-06-01',
      lastClass: 'SS 1A',
      reason: 'Family relocation to Accra',
      targetSchool: 'Accra Academy',
      transferDate: '2026-07-15',
      schoolName: 'Accra Boys School',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(200);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter web exec vitest run tests/services/transfer-certificate.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/services/transfer-certificate.ts`:

```typescript
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface TransferCertificateParams {
  studentName: string;
  studentIdNumber: string;
  dateOfBirth: string;
  lastClass: string;
  reason: string;
  targetSchool: string;
  transferDate: string;
  schoolName: string;
}

export async function generateTransferCertificate(params: TransferCertificateParams): Promise<Buffer> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });

  doc.setFontSize(18);
  doc.text('TRANSFER CERTIFICATE', 105, 30, { align: 'center' });

  doc.setFontSize(11);
  doc.text(`School: ${params.schoolName}`, 20, 50);
  doc.text(`Date of Issue: ${params.transferDate}`, 20, 58);

  (doc as any).autoTable({
    startY: 70,
    head: [['Field', 'Details']],
    body: [
      ['Student Name', params.studentName],
      ['Student ID', params.studentIdNumber],
      ['Date of Birth', params.dateOfBirth],
      ['Last Class Attended', params.lastClass],
      ['Reason for Transfer', params.reason],
      ['Target School', params.targetSchool],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.text('School Stamp & Signature:', 20, (doc as any).lastAutoTable.finalY + 20);
  doc.text('_________________________', 20, (doc as any).lastAutoTable.finalY + 28);
  doc.text('Authorized Signature', 20, (doc as any).lastAutoTable.finalY + 36);

  return Buffer.from(doc.output('arraybuffer'));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web exec vitest run tests/services/transfer-certificate.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/services/transfer-certificate.ts apps/web/tests/services/transfer-certificate.test.ts
git commit -m "feat(3a.3.1): add transfer certificate PDF generation"
```

---

### Task 4: Withdraw / Graduate endpoints

**Files:**
- Create: `apps/web/app/api/enrollments/[id]/withdraw/route.ts`
- Create: `apps/web/app/api/enrollments/[id]/graduate/route.ts`
- Test: `apps/web/tests/app/api/enrollments/lifecycle.test.ts`

**Depends on:** Task 2 (lifecycle service)

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/app/api/enrollments/lifecycle.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLifecycle = vi.fn();
vi.mock('@/services/enrollment-lifecycle', () => ({
  updateEnrollmentStatus: mockLifecycle,
}));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));

describe('POST /api/enrollments/[id]/withdraw', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 on successful withdrawal', async () => {
    mockLifecycle.mockResolvedValue({
      id: 'e1', status: 'withdrawn', endDate: '2026-07-15', transferReason: 'Left school', transferSchoolName: null,
    });

    const { POST } = await import('@/app/api/enrollments/[id]/withdraw/route');
    const res = await POST(new Request('http://localhost:3000/api/enrollments/e1/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Left school' }),
    }) as any, { params: { id: 'e1' } } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('withdrawn');
  });

  it('returns 422 if reason missing', async () => {
    const { POST } = await import('@/app/api/enrollments/[id]/withdraw/route');
    const res = await POST(new Request('http://localhost:3000/api/enrollments/e1/withdraw', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as any, { params: { id: 'e1' } } as any);

    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter web exec vitest run tests/app/api/enrollments/lifecycle.test.ts --reporter verbose
```
Expected: FAIL — route files not found

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/app/api/enrollments/[id]/withdraw/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateEnrollmentStatus } from '@/services/enrollment-lifecycle';

const schema = z.object({ reason: z.string().min(1, 'Reason is required') });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(422, 'Validation failed');

  try {
    const result = await updateEnrollmentStatus({
      enrollmentId: params.id,
      newStatus: 'withdrawn',
      reason: parsed.data.reason,
    });
    return apiSuccess(result);
  } catch (err: any) {
    if (err.message === 'Enrollment not found') return apiError(404, err.message);
    return apiError(422, err.message);
  }
}
```

Create `apps/web/app/api/enrollments/[id]/graduate/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateEnrollmentStatus } from '@/services/enrollment-lifecycle';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  try {
    const result = await updateEnrollmentStatus({
      enrollmentId: params.id,
      newStatus: 'graduated',
    });
    return apiSuccess(result);
  } catch (err: any) {
    if (err.message === 'Enrollment not found') return apiError(404, err.message);
    return apiError(422, err.message);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web exec vitest run tests/app/api/enrollments/lifecycle.test.ts --reporter verbose
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/enrollments/ apps/web/tests/app/api/enrollments/lifecycle.test.ts
git commit -m "feat(3a.3.1): add withdraw and graduate endpoints"
```

---

### Task 5: Transfer endpoint (with PDF certificate)

**Files:**
- Create: `apps/web/app/api/enrollments/[id]/transfer/route.ts`
- Add tests to: `apps/web/tests/app/api/enrollments/lifecycle.test.ts`

**Depends on:** Task 2 (lifecycle service), Task 3 (PDF service)

- [ ] **Step 1: Write the failing test**

Add to `apps/web/tests/app/api/enrollments/lifecycle.test.ts`:

```typescript
describe('POST /api/enrollments/[id]/transfer', () => {
  it('returns 200 with certificate info on successful transfer', async () => {
    mockLifecycle.mockResolvedValue({
      id: 'e1', status: 'transferred_out', endDate: '2026-07-15', transferReason: 'Moved to Accra Academy', transferSchoolName: 'Accra Academy',
    });

    const { POST } = await import('@/app/api/enrollments/[id]/transfer/route');
    const res = await POST(new Request('http://localhost:3000/api/enrollments/e1/transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Moved to Accra Academy', targetSchoolName: 'Accra Academy' }),
    }) as any, { params: { id: 'e1' } } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('transferred_out');
    expect(body.data.transferSchoolName).toBe('Accra Academy');
  });

  it('returns 422 if targetSchoolName missing', async () => {
    const { POST } = await import('@/app/api/enrollments/[id]/transfer/route');
    const res = await POST(new Request('http://localhost:3000/api/enrollments/e1/transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Moving' }),
    }) as any, { params: { id: 'e1' } } as any);

    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter web exec vitest run tests/app/api/enrollments/lifecycle.test.ts --reporter verbose
```
Expected: FAIL — route not found

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/app/api/enrollments/[id]/transfer/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateEnrollmentStatus } from '@/services/enrollment-lifecycle';
import { generateTransferCertificate } from '@/services/transfer-certificate';
import { db } from '@/lib/db';
import { enrollments, students, schools } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { resolveTenant } from '@/lib/tenant/resolve';

const schema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  targetSchoolName: z.string().min(1, 'Target school name is required'),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(422, 'Validation failed');

  try {
    const result = await updateEnrollmentStatus({
      enrollmentId: params.id,
      newStatus: 'transferred_out',
      reason: parsed.data.reason,
      targetSchoolName: parsed.data.targetSchoolName,
    });

    const [enrollment] = await db.select()
      .from(enrollments)
      .where(eq(enrollments.id, params.id))
      .limit(1);

    const [student] = await db.select()
      .from(students)
      .where(eq(students.id, enrollment.studentId))
      .limit(1);

    const [school] = await db.select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    const pdfBuffer = await generateTransferCertificate({
      studentName: `${student.firstName} ${student.lastName}`,
      studentIdNumber: student.studentIdNumber,
      dateOfBirth: student.dateOfBirth,
      lastClass: enrollment.classId,
      reason: parsed.data.reason,
      targetSchool: parsed.data.targetSchoolName,
      transferDate: new Date().toISOString().split('T')[0],
      schoolName: school?.name ?? 'School',
    });

    return apiSuccess({
      ...result,
      certificateSize: pdfBuffer.length,
    });
  } catch (err: any) {
    if (err.message === 'Enrollment not found') return apiError(404, err.message);
    return apiError(422, err.message);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web exec vitest run tests/app/api/enrollments/lifecycle.test.ts --reporter verbose
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/enrollments/ apps/web/tests/app/api/enrollments/lifecycle.test.ts
git commit -m "feat(3a.3.1): add transfer endpoint with PDF certificate generation"
```

---

### Task 6: Re-admission + inactive students list

**Files:**
- Create: `apps/web/app/api/students/[id]/re-admit/route.ts`
- Create: `apps/web/app/api/students/inactive/route.ts`
- Test: `apps/web/tests/app/api/students/re-admit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/app/api/students/re-admit.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/api/require-role', () => ({
  requireRole: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId: 'school-1' }),
}));

describe('POST /api/students/[id]/re-admit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('re-admits a withdrawn student', async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: 's1', status: 'withdrawn', firstName: 'John', lastName: 'Doe', schoolId: 'school-1' }])
      .mockResolvedValueOnce([{ id: 'c1', schoolId: 'school-1' }])
      .mockResolvedValueOnce([{ id: 'y1', schoolId: 'school-1', isCurrent: true }]);
    mockDb.returning.mockResolvedValue([{ id: 'e1', status: 'active', classId: 'c1', academicYearId: 'y1' }]);

    const { POST } = await import('@/app/api/students/[id]/re-admit/route');
    const res = await POST(new Request('http://localhost:3000/api/students/s1/re-admit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: 'c1', academicYearId: 'y1' }),
    }) as any, { params: { id: 's1' } } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.enrollment.status).toBe('active');
  });

  it('rejects re-admission for active student', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 's1', status: 'active', schoolId: 'school-1' }]);

    const { POST } = await import('@/app/api/students/[id]/re-admit/route');
    const res = await POST(new Request('http://localhost:3000/api/students/s1/re-admit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: 'c1', academicYearId: 'y1' }),
    }) as any, { params: { id: 's1' } } as any);

    expect(res.status).toBe(422);
  });
});

describe('GET /api/students/inactive', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns inactive students', async () => {
    mockDb.limit.mockResolvedValue([{ id: 's1', firstName: 'John', lastName: 'Doe', studentIdNumber: 'AABS2026001', status: 'withdrawn' }]);

    const { GET } = await import('@/app/api/students/inactive/route');
    const res = await GET(new Request('http://localhost:3000/api/students/inactive') as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.students.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm --filter web exec vitest run tests/app/api/students/re-admit.test.ts --reporter verbose
```
Expected: FAIL — route files not found

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/app/api/students/[id]/re-admit/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { students, enrollments, classes, academicYears } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

const schema = z.object({
  classId: z.string().uuid('Valid class ID is required'),
  academicYearId: z.string().uuid('Valid academic year ID is required'),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as any);

  const [student] = await db.select()
    .from(students)
    .where(and(eq(students.id, params.id), eq(students.schoolId, schoolId)))
    .limit(1);

  if (!student) return apiError(404, 'Student not found');
  if (student.status === 'active') return apiError(422, 'Student is already active');
  if (!['withdrawn', 'transferred_out'].includes(student.status!)) return apiError(422, `Cannot re-admit student with status '${student.status}'`);

  const [targetClass] = await db.select()
    .from(classes)
    .where(and(eq(classes.id, parsed.data.classId), eq(classes.schoolId, schoolId)))
    .limit(1);
  if (!targetClass) return apiError(404, 'Class not found');

  const [academicYear] = await db.select()
    .from(academicYears)
    .where(and(eq(academicYears.id, parsed.data.academicYearId), eq(academicYears.schoolId, schoolId)))
    .limit(1);
  if (!academicYear) return apiError(404, 'Academic year not found');

  const [enrollment] = await db.insert(enrollments).values({
    schoolId,
    studentId: student.id,
    classId: targetClass.id,
    academicYearId: academicYear.id,
    status: 'active',
    enrollmentDate: new Date().toISOString().split('T')[0],
  }).returning();

  await db.update(students)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(students.id, student.id));

  return apiSuccess({
    enrollment: { id: enrollment.id, status: enrollment.status, classId: enrollment.classId, academicYearId: enrollment.academicYearId },
    student: { id: student.id, status: 'active' },
  });
}
```

Create `apps/web/app/api/students/inactive/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { students } from '@edunexus/database';
import { eq, inArray, and } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();

  const studentList = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    studentIdNumber: students.studentIdNumber,
    status: students.status,
  }).from(students)
    .where(and(
      eq(students.schoolId, schoolId),
      inArray(students.status, ['withdrawn', 'transferred_out']),
    ))
    .orderBy(students.lastName)
    .limit(1000);

  const filtered = search
    ? studentList.filter(s =>
        s.firstName.toLowerCase().includes(search) ||
        s.lastName.toLowerCase().includes(search) ||
        s.studentIdNumber.toLowerCase().includes(search)
      )
    : studentList;

  return apiSuccess({ students: filtered });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web exec vitest run tests/app/api/students/re-admit.test.ts --reporter verbose
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/students/ apps/web/tests/app/api/students/re-admit.test.ts
git commit -m "feat(3a.3.1): add re-admission and inactive students list endpoints"
```

---

### Task 7: Typecheck + full test suite

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter web exec npx tsc --noEmit --pretty
```
Expected: No errors

- [ ] **Step 2: Run full test suite**

```bash
pnpm --filter web exec vitest run
```
Expected: All tests pass

- [ ] **Step 3: Final commit if fixes needed**

```bash
git add -A && git commit -m "chore(3a.3.1): typecheck and test fixes"
```

---

### Task 8: Push and create PR

- [ ] **Step 1: Push**

```bash
git push origin 52-3a3-1-transfer-withdrawal
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --base preview --head 52-3a3-1-transfer-withdrawal --title "feat(3a.3.1): Transfer / Withdrawal / Re-admission" --body "Implements lifecycle events for student enrollments. Closes #52"
```
