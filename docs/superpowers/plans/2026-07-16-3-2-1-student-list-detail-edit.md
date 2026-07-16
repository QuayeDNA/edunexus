# [3.2.1] Student List / Detail / Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the student management module for the admin portal — list with search/filter/pagination/stats, detail page with profile/enrollments/guardians, and edit page for profile fields.

**Architecture:** Follow existing admin portal patterns: server components fetch reference data, client components use raw `fetch()` + `useState`/`useEffect` for data. API layer follows `/api/applicants` pattern with Drizzle queries, pagination via `count()` + `limit`/`offset`, tenant scoping via `school_id` from `x-tenant-id` header.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, zod, react-hook-form, shadcn/ui Nova

## Global Constraints

- All queries scoped by `school_id` from `x-tenant-id` header
- All student data serialized to ISO strings before passing to client components
- TypeScript strict mode
- Use `cn()` from `@/lib/utils` for conditional class names
- Dates stored as ISO 8601 UTC, displayed in `en-GH` locale
- Empty states: icon + heading + description + CTA
- Loading states: skeleton loaders, never full-page spinners
- Use `Controller` + shadcn/ui Nova primitives over `FormField`/`FormItem` pattern

---

### Task 1: GET /api/students list endpoint

**Files:**
- Create: `apps/web/app/api/students/route.ts`
- Test: `tests/app/api/students/list.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `resolveTenant`, `apiSuccess`, `apiError`, `db`, Drizzle schema types
- Produces: `GET /api/students?search=&classId=&status=&gradeLevelId=&page=&pageSize=` returning `{ success, data: StudentRow[], meta }`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/app/api/students/list.test.ts`:
```typescript
import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/students/route';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'u1', role: 'admin', schoolId: 'school-1', email: 'a@b.com', name: 'A' },
  }),
}));
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
  };
  const countFn = vi.fn().mockResolvedValue([{ count: '5' }]);
  (mockDb as any).$count = countFn;
  return { db: mockDb, mockDb };
});

describe('GET /api/students', () => {
  it('returns paginated student list', async () => {
    const req = new NextRequest('http://localhost/api/students?page=1&pageSize=10');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
  it('filters by search term', async () => {
    const req = new NextRequest('http://localhost/api/students?search=John');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
  it('filters by classId', async () => {
    const req = new NextRequest('http://localhost/api/students?classId=c1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
  it('requires admin role', async () => {
    const { auth } = await import('@/lib/auth/auth.config');
    (auth as any).mockResolvedValueOnce({ user: { id: 'u2', role: 'student', schoolId: 'school-1' } });
    const req = new NextRequest('http://localhost/api/students');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
```

Run: `pnpm --filter web exec vitest run tests/app/api/students/list.test.ts`
Expected: FAIL — endpoint doesn't exist yet

- [ ] **Step 2: Implement GET /api/students**

Create `apps/web/app/api/students/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { students, enrollments, classes, gradeLevels, studentGuardians, guardians } from '@edunexus/database';
import { eq, and, or, desc, count, ilike, sql } from 'drizzle-orm';
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
  const search = searchParams.get('search')?.trim() || '';
  const classId = searchParams.get('classId');
  const status = searchParams.get('status');
  const gradeLevelId = searchParams.get('gradeLevelId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  const conditions = [eq(students.schoolId, schoolId)];
  if (search) {
    conditions.push(or(
      ilike(students.firstName, `%${search}%`),
      ilike(students.lastName, `%${search}%`),
      ilike(students.studentIdNumber, `%${search}%`),
    ));
  }
  if (status) conditions.push(eq(students.status, status));

  // If gradeLevelId is set, filter via classes join
  let gradeJoin;
  if (gradeLevelId) {
    gradeJoin = and(eq(classes.gradeLevelId, gradeLevelId));
  }

  const [totalResult] = await db.select({ count: count() }).from(students).where(and(...conditions));
  const total = Number(totalResult.count);

  const rows = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    otherNames: students.otherNames,
    studentIdNumber: students.studentIdNumber,
    gender: students.gender,
    status: students.status,
    enrollmentDate: students.enrollmentDate,
    className: classes.name,
    gradeLevelName: gradeLevels.name,
    guardianName: sql<string>`(
      SELECT CONCAT(g.first_name, ' ', g.last_name)
      FROM ${studentGuardians} sg
      JOIN ${guardians} g ON g.id = sg.guardian_id
      WHERE sg.student_id = ${students.id}
      ORDER BY sg.is_primary DESC
      LIMIT 1
    )`,
  })
    .from(students)
    .leftJoin(enrollments, and(
      eq(enrollments.studentId, students.id),
      eq(enrollments.status, 'active'),
    ))
    .leftJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(gradeLevels, eq(gradeLevels.id, classes.gradeLevelId))
    .where(and(...conditions, gradeLevelId ? eq(classes.gradeLevelId, gradeLevelId) : undefined))
    .orderBy(students.lastName)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(rows, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm --filter web exec vitest run tests/app/api/students/list.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/students/route.ts tests/app/api/students/list.test.ts
git commit -m "feat(3.2.1): add GET /api/students list endpoint with search/filter/pagination"
```

---

### Task 2: GET /api/students/stats endpoint

**Files:**
- Create: `apps/web/app/api/students/stats/route.ts`

- [ ] **Step 1: Implement GET /api/students/stats**

Create `apps/web/app/api/students/stats/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { students, enrollments, classes } from '@edunexus/database';
import { eq, and, count, sql } from 'drizzle-orm';
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

  const [totalResult] = await db.select({ count: count() })
    .from(students).where(eq(students.schoolId, schoolId));
  const total = Number(totalResult.count);

  const [activeResult] = await db.select({ count: count() })
    .from(students).where(and(eq(students.schoolId, schoolId), eq(students.status, 'active')));
  const activeCount = Number(activeResult.count);

  const byStatus = await db.select({ status: students.status, count: count() })
    .from(students).where(eq(students.schoolId, schoolId))
    .groupBy(students.status).orderBy(students.status);

  const byClass = await db.select({ className: classes.name, count: count() })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.status, 'active')))
    .groupBy(classes.name)
    .orderBy(sql`count DESC`)
    .limit(8);

  return apiSuccess({ total, activeCount, byStatus, byClass });
}
```

- [ ] **Step 2: Verify the route compiles**

Run: `pnpm --filter web exec npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/students/stats/route.ts
git commit -m "feat(3.2.1): add GET /api/students/stats endpoint"
```

---

### Task 3: GET /api/students/[id] + PATCH /api/students/[id]

**Files:**
- Create: `apps/web/app/api/students/[id]/route.ts`
- Test: `tests/app/api/students/detail.test.ts`, `tests/app/api/students/update.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/app/api/students/detail.test.ts`:
```typescript
import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/students/[id]/route';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'u1', role: 'admin', schoolId: 'school-1', email: 'a@b.com', name: 'A' },
  }),
}));
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 's1', firstName: 'John' }]),
  },
}));

describe('GET /api/students/[id]', () => {
  it('returns student detail', async () => {
    const req = new NextRequest('http://localhost/api/students/s1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(200);
  });
  it('returns 404 for missing student', async () => {
    const { db } = await import('@/lib/db');
    (db as any).limit.mockResolvedValueOnce([]);
    const req = new NextRequest('http://localhost/api/students/missing');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });
});
```

Create `tests/app/api/students/update.test.ts`:
```typescript
import { vi, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/students/[id]/route';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'u1', role: 'admin', schoolId: 'school-1', email: 'a@b.com', name: 'A' },
  }),
}));
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 's1' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 's1', firstName: 'Updated' }]),
  },
}));

describe('PATCH /api/students/[id]', () => {
  it('updates student profile', async () => {
    const req = new NextRequest('http://localhost/api/students/s1', {
      method: 'PATCH',
      body: JSON.stringify({ firstName: 'Updated', lastName: 'Name' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(200);
  });
  it('validates request body', async () => {
    const req = new NextRequest('http://localhost/api/students/s1', {
      method: 'PATCH',
      body: JSON.stringify({ gender: 'invalid' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await PATCH(req, { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(422);
  });
});
```

Run: `pnpm --filter web exec vitest run tests/app/api/students/detail.test.ts tests/app/api/students/update.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement the endpoint**

Create `apps/web/app/api/students/[id]/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { students, enrollments, classes, academicYears, studentGuardians, guardians } from '@edunexus/database';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

const updateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  otherNames: z.string().max(100).nullable().optional(),
  gender: z.enum(['male', 'female']).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  placeOfBirth: z.string().max(100).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  religion: z.string().max(50).nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).nullable().optional(),
  medicalNotes: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [student] = await db.select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
    .limit(1);
  if (!student) return apiError(404, 'Student not found');

  const enrollmentRows = await db.select({
    id: enrollments.id,
    className: classes.name,
    academicYearName: academicYears.name,
    status: enrollments.status,
    enrollmentDate: enrollments.enrollmentDate,
    endDate: enrollments.endDate,
  })
    .from(enrollments)
    .leftJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
    .where(and(eq(enrollments.studentId, id), eq(enrollments.schoolId, schoolId)))
    .orderBy(desc(enrollments.enrollmentDate));

  const guardianRows = await db.select({
    id: guardians.id,
    firstName: guardians.firstName,
    lastName: guardians.lastName,
    relationship: studentGuardians.relationship,
    phone: guardians.phone,
    email: guardians.email,
    occupation: guardians.occupation,
    isPrimary: studentGuardians.isPrimary,
  })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(eq(studentGuardians.studentId, id));

  return apiSuccess({
    ...student,
    dateOfBirth: student.dateOfBirth.toISOString(),
    enrollmentDate: student.enrollmentDate.toISOString(),
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
    enrollments: enrollmentRows,
    guardians: guardianRows,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [existing] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
    .limit(1);
  if (!existing) return apiError(404, 'Student not found');

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [updated] = await db.update(students)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();

  return apiSuccess({
    ...updated,
    dateOfBirth: updated.dateOfBirth.toISOString(),
    enrollmentDate: updated.enrollmentDate.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm --filter web exec vitest run tests/app/api/students/detail.test.ts tests/app/api/students/update.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/students/\[id\]/route.ts tests/app/api/students/detail.test.ts tests/app/api/students/update.test.ts
git commit -m "feat(3.2.1): add GET + PATCH /api/students/:id endpoints"
```

---

### Task 4: Student list page UI

**Files:**
- Create: `apps/web/app/(school)/admin/students/page.tsx`
- Create: `apps/web/components/admin/students/student-table.tsx`
- Create: `apps/web/components/admin/students/student-stats-bar.tsx`

- [ ] **Step 1: Create the server component**

Create `apps/web/app/(school)/admin/students/page.tsx`:
```typescript
import { db } from '@/lib/db';
import { classes, gradeLevels } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { StudentTable } from '@/components/admin/students/student-table';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const session = await requireRole('admin', 'super_admin');

  const [classList, gradeList] = await Promise.all([
    session.user.schoolId
      ? db.select({ id: classes.id, name: classes.name, code: classes.code, gradeLevelId: classes.gradeLevelId })
          .from(classes)
          .where(eq(classes.schoolId, session.user.schoolId))
          .orderBy(classes.name)
      : Promise.resolve([]),
    session.user.schoolId
      ? db.select({ id: gradeLevels.id, name: gradeLevels.name, code: gradeLevels.code })
          .from(gradeLevels)
          .where(eq(gradeLevels.schoolId, session.user.schoolId))
          .orderBy(gradeLevels.sortOrder)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Students" description="Manage student records">
        <Button asChild>
          <Link href="/admin/students/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </PageHeader>
      <StudentTable classes={classList} gradeLevels={gradeList} />
    </div>
  );
}
```

- [ ] **Step 2: Create the stats bar component**

Create `apps/web/components/admin/students/student-stats-bar.tsx`:
```typescript
'use client';

import { StatCard } from '@/components/stat-card';
import { Users, UserCheck, UserX, UserMinus } from 'lucide-react';

interface ClassStat { className: string; count: number }
interface StatsData {
  total: number;
  activeCount: number;
  byStatus: Array<{ status: string; count: number }>;
  byClass: ClassStat[];
}
interface StudentStatsBarProps {
  stats: StatsData;
  activeStatus: string | null;
  onStatusChange: (status: string | null) => void;
  onClassFilter: (className: string | null) => void;
}

export function StudentStatsBar({ stats, activeStatus, onStatusChange, onClassFilter }: StudentStatsBarProps) {
  const statusCounts = Object.fromEntries(stats.byStatus.map(s => [s.status, s.count]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <StatCard icon={Users} label="Total Enrolled" value={stats.total}
          onClick={() => onStatusChange(null)} active={activeStatus === null} />
        <StatCard icon={UserCheck} label="Active" value={stats.activeCount}
          onClick={() => onStatusChange('active')} active={activeStatus === 'active'} />
        <StatCard icon={UserX} label="Withdrawn" value={statusCounts['withdrawn'] ?? 0}
          onClick={() => onStatusChange('withdrawn')} active={activeStatus === 'withdrawn'} />
        <StatCard icon={UserMinus} label="Transferred" value={statusCounts['transferred_out'] ?? 0}
          onClick={() => onStatusChange('transferred_out')} active={activeStatus === 'transferred_out'} />
      </div>
      {stats.byClass.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Classes:</span>
          {stats.byClass.slice(0, 8).map(c => (
            <button key={c.className}
              onClick={() => onClassFilter(c.className)}
              className="rounded-full border bg-muted/30 px-3 py-1 text-xs transition-colors hover:bg-muted">
              {c.className}: {c.count}
            </button>
          ))}
          {stats.byClass.length > 8 && (
            <span className="text-xs text-muted-foreground">+{stats.byClass.length - 8} more</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the student table client component**

Create `apps/web/components/admin/students/student-table.tsx`:
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StudentStatsBar } from './student-stats-bar';

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  withdrawn: 'bg-red-100 text-red-800',
  transferred_out: 'bg-orange-100 text-orange-800',
  graduated: 'bg-blue-100 text-blue-800',
};
const statusLabel: Record<string, string> = {
  active: 'Active', withdrawn: 'Withdrawn',
  transferred_out: 'Transferred', graduated: 'Graduated',
};

interface ClassOption { id: string; name: string; code: string | null; gradeLevelId: string }
interface GradeOption { id: string; name: string; code: string }
interface StudentTableProps { classes: ClassOption[]; gradeLevels: GradeOption[] }
interface StudentRow {
  id: string; firstName: string; lastName: string; otherNames: string | null;
  studentIdNumber: string; gender: string; status: string;
  enrollmentDate: string; className: string | null;
  gradeLevelName: string | null; guardianName: string | null;
}
interface StatsData {
  total: number; activeCount: number;
  byStatus: Array<{ status: string; count: number }>;
  byClass: Array<{ className: string; count: number }>;
}

export function StudentTable({ classes, gradeLevels }: StudentTableProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [classId, setClassId] = useState<string>('');
  const [gradeLevelId, setGradeLevelId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (classId) params.set('classId', classId);
      if (gradeLevelId) params.set('gradeLevelId', gradeLevelId);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('pageSize', '20');

      const [studentsRes, statsRes] = await Promise.all([
        fetch(`/api/students?${params}`),
        fetch('/api/students/stats'),
      ]);
      if (studentsRes.ok) {
        const d = await studentsRes.json();
        setStudents(d.data ?? []);
        setTotalPages(d.meta?.totalPages ?? 1);
        setTotal(d.meta?.total ?? 0);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data);
      }
    } finally { setLoading(false); }
  }, [status, classId, gradeLevelId, search, page]);

  useEffect(() => { fetchData(); }, [status, classId, gradeLevelId, page]);
  useEffect(() => { setPage(1); }, [status, classId, gradeLevelId]);

  const handleClassFilter = (className: string | null) => {
    if (!className) { setClassId(''); return; }
    const found = classes.find(c => c.name === className);
    setClassId(found?.id ?? '');
  };

  return (
    <div className="space-y-6">
      {stats && (
        <StudentStatsBar stats={stats} activeStatus={status}
          onStatusChange={setStatus} onClassFilter={handleClassFilter} />
      )}
      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select value={classId} onValueChange={v => setClassId(v as string)}>
            <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={gradeLevelId} onValueChange={v => setGradeLevelId(v as string)}>
            <SelectTrigger><SelectValue placeholder="All Grades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Grades</SelectItem>
              {gradeLevels.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search by name or ID..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchData(); }} />
        </div>
        <Button variant="outline" onClick={fetchData}>Refresh</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No students found</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/students/${s.id}`} className="font-medium hover:underline">
                        {s.firstName} {s.lastName}
                      </Link>
                      {s.guardianName && (
                        <p className="text-xs text-muted-foreground">{s.guardianName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.studentIdNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.className ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadge[s.status] ?? ''}>
                        {statusLabel[s.status] ?? s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/students/${s.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
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
              <Button variant="outline" size="sm" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify the pages compile**

Run: `pnpm --filter web exec npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/page.tsx apps/web/components/admin/students/student-table.tsx apps/web/components/admin/students/student-stats-bar.tsx
git commit -m "feat(3.2.1): add student list page with stats bar and filterable table"
```

---

### Task 5: Student detail page UI

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/page.tsx`
- Create: `apps/web/components/admin/students/student-detail-info.tsx`
- Create: `apps/web/components/admin/students/student-guardians.tsx`
- Create: `apps/web/components/admin/students/student-enrollments.tsx`
- Create: `apps/web/components/admin/students/student-audit-log.tsx`

- [ ] **Step 1: Create the server component**

Create `apps/web/app/(school)/admin/students/[id]/page.tsx`:
```typescript
import { db } from '@/lib/db';
import { students, enrollments, classes, academicYears, studentGuardians, guardians } from '@edunexus/database';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentDetailInfo } from '@/components/admin/students/student-detail-info';
import { StudentGuardians } from '@/components/admin/students/student-guardians';
import { StudentEnrollments } from '@/components/admin/students/student-enrollments';
import { StudentAuditLog } from '@/components/admin/students/student-audit-log';

export const dynamic = 'force-dynamic';

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-800', withdrawn: 'bg-red-100 text-red-800',
  transferred_out: 'bg-orange-100 text-orange-800', graduated: 'bg-blue-100 text-blue-800',
};
const statusLabel: Record<string, string> = {
  active: 'Active', withdrawn: 'Withdrawn',
  transferred_out: 'Transferred', graduated: 'Graduated',
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('admin', 'super_admin');

  const [student] = await db.select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.schoolId, session.user.schoolId!)))
    .limit(1);
  if (!student) notFound();

  const enrollmentRows = await db.select({
    id: enrollments.id, className: classes.name,
    academicYearName: academicYears.name, status: enrollments.status,
    enrollmentDate: enrollments.enrollmentDate, endDate: enrollments.endDate,
  }).from(enrollments)
    .leftJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
    .where(and(eq(enrollments.studentId, id), eq(enrollments.schoolId, session.user.schoolId!)))
    .orderBy(desc(enrollments.enrollmentDate));

  const guardianRows = await db.select({
    id: guardians.id, firstName: guardians.firstName,
    lastName: guardians.lastName, relationship: studentGuardians.relationship,
    phone: guardians.phone, email: guardians.email,
    occupation: guardians.occupation, isPrimary: studentGuardians.isPrimary,
  }).from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(eq(studentGuardians.studentId, id));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/students"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Link>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{student.firstName} {student.lastName}</h1>
            <Badge className={statusBadge[student.status] ?? ''}>
              {statusLabel[student.status] ?? student.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ID: {student.studentIdNumber} · Enrolled {new Date(student.enrollmentDate).toLocaleDateString('en-GH', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/admin/students/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Profile
          </Link>
        </Button>
      </div>
      <StudentDetailInfo student={{ ...student, dateOfBirth: student.dateOfBirth.toISOString(), enrollmentDate: student.enrollmentDate.toISOString() }} />
      <StudentGuardians guardians={guardianRows} />
      <StudentEnrollments enrollments={enrollmentRows} />
      <StudentAuditLog studentId={id} />
    </div>
  );
}
```

- [ ] **Step 2: Create the detail info component**

Create `apps/web/components/admin/students/student-detail-info.tsx`:
```typescript
'use client';

interface StudentDetail {
  id: string; firstName: string; lastName: string; otherNames: string | null;
  studentIdNumber: string; gender: string; dateOfBirth: string;
  placeOfBirth: string | null; nationality: string | null; religion: string | null;
  address: string | null; phone: string | null; email: string | null;
  bloodGroup: string | null; medicalNotes: string | null;
  enrollmentDate: string; status: string;
}

export function StudentDetailInfo({ student }: { student: StudentDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Personal Information
          </h3>
          <dl className="space-y-2 text-sm">
            <Row label="Full Name" value={`${student.firstName} ${student.lastName}${student.otherNames ? ` (${student.otherNames})` : ''}`} />
            <Row label="Date of Birth" value={new Date(student.dateOfBirth).toLocaleDateString('en-GH')} />
            <Row label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />
            <Row label="Nationality" value={student.nationality} />
            <Row label="Religion" value={student.religion} />
            <Row label="Blood Group" value={student.bloodGroup} />
            <Row label="Place of Birth" value={student.placeOfBirth} />
          </dl>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Medical Notes
          </h3>
          <p className="text-sm">{student.medicalNotes || 'None recorded'}</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contact Information
          </h3>
          <dl className="space-y-2 text-sm">
            <Row label="Phone" value={student.phone} />
            <Row label="Email" value={student.email} />
            <Row label="Address" value={student.address} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}
```

- [ ] **Step 3: Create the guardians component**

Create `apps/web/components/admin/students/student-guardians.tsx`:
```typescript
'use client';

interface GuardianRow {
  id: string; firstName: string; lastName: string;
  relationship: string; phone: string | null;
  email: string | null; occupation: string | null; isPrimary: boolean;
}

export function StudentGuardians({ guardians }: { guardians: GuardianRow[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Guardians
      </h3>
      {guardians.length === 0 ? (
        <p className="text-sm text-muted-foreground">No guardians recorded</p>
      ) : (
        <div className="space-y-2">
          {guardians.map(g => (
            <div key={g.id} className="rounded-md bg-muted px-3 py-2 text-sm">
              <p className="font-medium">{g.firstName} {g.lastName} ({g.relationship}){g.isPrimary ? ' · Primary' : ''}</p>
              <p className="text-muted-foreground">{g.phone ?? '—'} · {g.email ?? '—'}</p>
              {g.occupation && <p className="text-muted-foreground">{g.occupation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the enrollments component**

Create `apps/web/components/admin/students/student-enrollments.tsx`:
```typescript
'use client';

import { Badge } from '@/components/ui/badge';

interface EnrollmentRow {
  id: string; className: string | null; academicYearName: string | null;
  status: string; enrollmentDate: string; endDate: string | null;
}

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  withdrawn: 'bg-red-100 text-red-800',
  transferred_out: 'bg-orange-100 text-orange-800',
  graduated: 'bg-blue-100 text-blue-800',
};

export function StudentEnrollments({ enrollments }: { enrollments: EnrollmentRow[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Enrollment History
      </h3>
      {enrollments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrollment records</p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Academic Year</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">{e.academicYearName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{e.className ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusBadge[e.status] ?? ''}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(e.enrollmentDate).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                    {e.endDate ? ` — ${new Date(e.endDate).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}` : ' — Present'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create the audit log component**

Create `apps/web/components/admin/students/student-audit-log.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditEntry {
  id: string; action: string; tableName: string;
  createdAt: string; userId: string | null;
}

export function StudentAuditLog({ studentId }: { studentId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/audit-logs?tableName=students&recordId=${studentId}&limit=10`)
      .then(r => r.json())
      .then(d => setEntries(d.data ?? []))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Activity Log
      </h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(e => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="font-medium capitalize">{e.action.toLowerCase()}</span>
              <span className="text-muted-foreground">
                {new Date(e.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify the pages compile**

Run: `pnpm --filter web exec npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/page.tsx apps/web/components/admin/students/student-detail-info.tsx apps/web/components/admin/students/student-guardians.tsx apps/web/components/admin/students/student-enrollments.tsx apps/web/components/admin/students/student-audit-log.tsx
git commit -m "feat(3.2.1): add student detail page with info, guardians, enrollments, audit log"
```

---

### Task 6: Student edit page UI

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/edit/page.tsx`
- Create: `apps/web/components/admin/students/edit-student-form.tsx`

- [ ] **Step 1: Create the server component**

Create `apps/web/app/(school)/admin/students/[id]/edit/page.tsx`:
```typescript
import { db } from '@/lib/db';
import { students } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EditStudentForm } from '@/components/admin/students/edit-student-form';

export const dynamic = 'force-dynamic';

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('admin', 'super_admin');

  const [student] = await db.select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.schoolId, session.user.schoolId!)))
    .limit(1);
  if (!student) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/students/${id}`}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Student
        </Link>
      </div>
      <EditStudentForm student={{
        ...student,
        dateOfBirth: student.dateOfBirth.toISOString().split('T')[0],
      }} />
    </div>
  );
}
```

- [ ] **Step 2: Create the edit form component**

Create `apps/web/components/admin/students/edit-student-form.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const formSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  otherNames: z.string().max(100).optional().or(z.literal('')),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().min(1, 'Required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  placeOfBirth: z.string().max(100).optional().or(z.literal('')),
  nationality: z.string().max(100).optional().or(z.literal('')),
  religion: z.string().max(50).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  medicalNotes: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface StudentData {
  id: string; firstName: string; lastName: string; otherNames: string | null;
  gender: string; dateOfBirth: string; placeOfBirth: string | null;
  nationality: string | null; religion: string | null; address: string | null;
  phone: string | null; email: string | null; bloodGroup: string | null;
  medicalNotes: string | null;
}

export function EditStudentForm({ student }: { student: StudentData }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const { handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: student.firstName,
      lastName: student.lastName,
      otherNames: student.otherNames ?? '',
      gender: student.gender as 'male' | 'female',
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth ?? '',
      nationality: student.nationality ?? '',
      religion: student.religion ?? '',
      address: student.address ?? '',
      phone: student.phone ?? '',
      email: student.email ?? '',
      bloodGroup: student.bloodGroup ?? '',
      medicalNotes: student.medicalNotes ?? '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setServerError('');
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]),
      );
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? 'Failed to update student');
        return;
      }
      toast.success('Student profile updated');
      router.push(`/admin/students/${student.id}`);
      router.refresh();
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-8">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{serverError}</div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="First Name" error={errors.firstName?.message}>
          <Controller name="firstName" control={control} render={({ field }) => <Input {...field} />} />
        </Field>
        <Field label="Last Name" error={errors.lastName?.message}>
          <Controller name="lastName" control={control} render={({ field }) => <Input {...field} />} />
        </Field>
        <Field label="Other Names">
          <Controller name="otherNames" control={control} render={({ field }) => <Input {...field} />} />
        </Field>
        <Field label="Gender" error={errors.gender?.message}>
          <Controller name="gender" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </Field>
        <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
          <Controller name="dateOfBirth" control={control} render={({ field }) => <Input {...field} placeholder="YYYY-MM-DD" />} />
        </Field>
        <Field label="Place of Birth">
          <Controller name="placeOfBirth" control={control} render={({ field }) => <Input {...field} />} />
        </Field>
        <Field label="Nationality">
          <Controller name="nationality" control={control} render={({ field }) => <Input {...field} />} />
        </Field>
        <Field label="Religion">
          <Controller name="religion" control={control} render={({ field }) => <Input {...field} />} />
        </Field>
        <Field label="Phone">
          <Controller name="phone" control={control} render={({ field }) => <Input {...field} />} />
        </Field>
        <Field label="Email">
          <Controller name="email" control={control} render={({ field }) => <Input {...field} type="email" />} />
        </Field>
        <Field label="Blood Group">
          <Controller name="bloodGroup" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </Field>
      </div>

      <Field label="Address">
        <Controller name="address" control={control} render={({ field }) => <Textarea {...field} />} />
      </Field>
      <Field label="Medical Notes">
        <Controller name="medicalNotes" control={control} render={({ field }) => <Textarea {...field} />} />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verify the pages compile**

Run: `pnpm --filter web exec npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/edit/page.tsx apps/web/components/admin/students/edit-student-form.tsx
git commit -m "feat(3.2.1): add student edit page with profile form"
```

---

### Task 7: Sidebar navigation change

**Files:**
- Modify: `apps/web/components/layouts/admin-sidebar.tsx`

- [ ] **Step 1: Change sidebar link**

In `apps/web/components/layouts/admin-sidebar.tsx`, line 18:
```typescript
// Before:
{ href: '/admin/students/new', label: 'Students', icon: Users },
// After:
{ href: '/admin/students', label: 'Students', icon: Users },
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/layouts/admin-sidebar.tsx
git commit -m "fix(3.2.1): update sidebar Students link to list page root"
```

---

### Task 8: Typecheck + full test suite

- [ ] **Step 1: Run typecheck**

Run: `pnpm --filter web exec npx tsc --noEmit --pretty`
Expected: Clean, no errors

- [ ] **Step 2: Run all student API tests**

Run: `pnpm --filter web exec vitest run tests/app/api/students/`
Expected: All pass

- [ ] **Step 3: Run the full existing test suite**

Run: `pnpm --filter web exec vitest run`
Expected: All 153+ tests pass (no regressions)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
# If any typecheck or test fixes were applied:
git add -A
git commit -m "fix(3.2.1): typecheck and test fixes"
```

- [ ] **Step 5: Push branch**

```bash
git push -u origin 32-3-2-1-student-list-detail-edit
```
