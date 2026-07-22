# [3.1.4] Class-Subject-Teacher Assignment Matrix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Matrix UI for admins to bulk-assign teachers to subject-class pairs within a grade level, with atomic batch save and per-row error reporting.

**Architecture:** Full matrix replacement via single `PUT` endpoint — frontend sends all assignments for a grade level, server validates + deletes + inserts in a transaction. `class_subjects` pivot table already exists, just needs a unique constraint.

**Tech Stack:** Drizzle ORM, Next.js 16, Zod, Nova/shadcn, TanStack Query, Vitest.

## Global Constraints

- All tenant-scoped queries include `schoolId` filter
- Services throw `AppError` subclasses; route handlers use `routeHandler()` wrapper
- Auth: `requireRole('admin')` on all endpoints
- Drizzle `.returning()` on inserts/updates where needed
- Dates: ISO 8601 UTC
- No comments, single quotes, semicolons in production code
- Import from `@edunexus/database` never `@edunexus/database/src/schema`
- Import within `apps/web` uses `@/` alias

---

**File Structure:**

```
Modify:  packages/database/src/schema/class-subjects.ts        — add unique constraint
Create:  apps/web/services/class-subject-teacher/class-subject-teacher.ts
Create:  apps/web/services/class-subject-teacher/validation.ts
Create:  apps/web/app/api/class-subject-teacher/route.ts
Create:  apps/web/app/(school)/admin/class-subject-teacher/page.tsx
Create:  apps/web/components/admin/class-subject-teacher/matrix-client.tsx
Modify:  apps/web/components/layouts/admin-sidebar.tsx          — add nav item
Create:  apps/web/tests/services/class-subject-teacher/class-subject-teacher.test.ts
Create:  apps/web/tests/app/api/class-subject-teacher/route.test.ts
```

---

### Task 1: Schema — add unique constraint

**Files:**
- Modify: `packages/database/src/schema/class-subjects.ts`

**Interfaces:**
- Consumes: existing `classSubjects` table
- Produces: table with unique constraint on `(class_id, subject_id)`

- [ ] **Step 1: Add uniqueIndex to class-subjects.ts**

Change the indexes array in `packages/database/src/schema/class-subjects.ts`:

```ts
import { pgTable, uuid, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";

// ... columns stay the same ...

  (table) => [
    index("idx_class_subjects_school_id").on(table.schoolId),
    index("idx_class_subjects_class_id").on(table.classId),
    index("idx_class_subjects_subject_id").on(table.subjectId),
    index("idx_class_subjects_teacher_id").on(table.teacherId),
    uniqueIndex("idx_class_subjects_class_subject").on(table.classId, table.subjectId),
  ],
```

Import `uniqueIndex` from `drizzle-orm/pg-core`.

- [ ] **Step 2: Run migration**

```bash
cd packages/database && pnpm migrate
```

Expected: `drizzle-kit push` applies the new unique index.

- [ ] **Step 3: Commit**

```bash
git add packages/database/src/schema/class-subjects.ts
git commit -m "feat(3.1.4): add unique constraint on class_subjects(class_id, subject_id)"
```

---

### Task 2: Services — getMatrix + saveMatrix

**Files:**
- Create: `apps/web/services/class-subject-teacher/class-subject-teacher.ts`
- Create: `apps/web/services/class-subject-teacher/validation.ts`

**Interfaces:**
- Consumes: `classSubjects`, `classes`, `subjects`, `subjectGradeLevels`, `staff` from `@edunexus/database`
- Produces: `getMatrix(ctx, gradeLevelId, academicYearId)`, `saveMatrix(ctx, gradeLevelId, assignments[])`

- [ ] **Step 1: Create validation.ts**

```ts
import { eq, and } from 'drizzle-orm';
import { staff } from '@edunexus/database';
import { NotFoundError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export async function validateTeacher(ctx: ServiceContext, teacherId: string | null): Promise<string | null> {
  if (!teacherId) return null;
  const [row] = await ctx.db.select({ id: staff.id }).from(staff)
    .where(and(eq(staff.id, teacherId), eq(staff.schoolId, ctx.schoolId), eq(staff.status, 'active')))
    .limit(1);
  if (!row) return `Teacher ${teacherId} not found or inactive in this school`;
  return teacherId;
}
```

- [ ] **Step 2: Create class-subject-teacher.ts**

```ts
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { classSubjects, classes, subjects, subjectGradeLevels } from '@edunexus/database';
import { validateTeacher } from './validation';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export interface MatrixAssignment {
  classId: string;
  subjectId: string;
  teacherId: string | null;
}

export interface MatrixData {
  classes: { id: string; name: string; code: string | null }[];
  subjects: { id: string; name: string; code: string; isCore: boolean }[];
  assignments: MatrixAssignment[];
}

export interface SaveResult {
  saved: number;
  errors: { classId: string; subjectId: string; error: string }[];
}

export const saveMatrixSchema = z.object({
  gradeLevelId: z.string().min(1, 'Grade level is required'),
  assignments: z.array(z.object({
    classId: z.string().min(1),
    subjectId: z.string().min(1),
    teacherId: z.string().nullable().optional(),
  })).default([]),
});

export async function getMatrix(ctx: ServiceContext, gradeLevelId: string, academicYearId: string): Promise<MatrixData> {
  const classRows = await ctx.db.select({ id: classes.id, name: classes.name, code: classes.code })
    .from(classes)
    .where(and(eq(classes.schoolId, ctx.schoolId), eq(classes.gradeLevelId, gradeLevelId), eq(classes.academicYearId, academicYearId), eq(classes.deletedAt, null)))
    .orderBy(classes.name);

  const subjectRows = await ctx.db.select({
    id: subjects.id,
    name: subjects.name,
    code: subjects.code,
    isCore: subjectGradeLevels.isCore,
  })
    .from(subjects)
    .innerJoin(subjectGradeLevels, and(
      eq(subjectGradeLevels.subjectId, subjects.id),
      eq(subjectGradeLevels.gradeLevelId, gradeLevelId),
    ))
    .where(eq(subjects.schoolId, ctx.schoolId))
    .orderBy(subjects.name);

  const classIds = classRows.map((c) => c.id);
  const assignmentRows = classIds.length > 0
    ? await ctx.db.select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId, teacherId: classSubjects.teacherId })
        .from(classSubjects)
        .where(and(eq(classSubjects.schoolId, ctx.schoolId), inArray(classSubjects.classId, classIds)))
    : [];

  return {
    classes: classRows,
    subjects: subjectRows,
    assignments: assignmentRows.map((a) => ({ ...a, teacherId: a.teacherId ?? null })),
  };
}

export async function saveMatrix(ctx: ServiceContext, gradeLevelId: string, assignments: MatrixAssignment[]): Promise<SaveResult> {
  const errors: { classId: string; subjectId: string; error: string }[] = [];
  const validAssignments: MatrixAssignment[] = [];

  for (const a of assignments) {
    const validatedTeacherId = await validateTeacher(ctx, a.teacherId);
    if (a.teacherId && !validatedTeacherId) {
      errors.push({ classId: a.classId, subjectId: a.subjectId, error: `Invalid teacher ID: ${a.teacherId}` });
    } else {
      validAssignments.push({ classId: a.classId, subjectId: a.subjectId, teacherId: validatedTeacherId });
    }
  }

  await ctx.db.transaction(async (tx: any) => {
    const classIds = [...new Set(assignments.map((a) => a.classId))];
    if (classIds.length > 0) {
      await tx.delete(classSubjects)
        .where(and(eq(classSubjects.schoolId, ctx.schoolId), inArray(classSubjects.classId, classIds)));
    }

    if (validAssignments.length > 0) {
      await tx.insert(classSubjects).values(
        validAssignments.map((a) => ({
          schoolId: ctx.schoolId,
          classId: a.classId,
          subjectId: a.subjectId,
          teacherId: a.teacherId,
        })),
      );
    }
  });

  return { saved: validAssignments.length, errors };
}
```

- [ ] **Step 3: Create test file**

`apps/web/tests/services/class-subject-teacher/class-subject-teacher.test.ts`:

```ts
import { vi, describe, it, expect } from 'vitest';
import { getMatrix, saveMatrix } from '@/services/class-subject-teacher/class-subject-teacher';

vi.mock('@edunexus/database', () => ({}));

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn((cb: any) => cb({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    })),
  };
}

const schoolId = 'school-1';

describe('getMatrix', () => {
  it('returns empty matrix when no classes or subjects', async () => {
    const mockDb = createMockDb();
    mockDb.orderBy.mockResolvedValueOnce([]);
    mockDb.orderBy.mockResolvedValueOnce([]);
    const result = await getMatrix({ db: mockDb, schoolId }, 'gl-1', 'ay-1');
    expect(result.classes).toHaveLength(0);
    expect(result.subjects).toHaveLength(0);
    expect(result.assignments).toHaveLength(0);
  });

  it('returns classes, subjects, and assignments', async () => {
    const mockDb = createMockDb();
    mockDb.orderBy.mockResolvedValueOnce([{ id: 'c-1', name: 'Class 1', code: 'P1-A' }]);
    mockDb.orderBy.mockResolvedValueOnce([{ id: 's-1', name: 'Math', code: 'MATH', isCore: true }]);
    mockDb.where.mockResolvedValueOnce([{ classId: 'c-1', subjectId: 's-1', teacherId: null }]);
    const result = await getMatrix({ db: mockDb, schoolId }, 'gl-1', 'ay-1');
    expect(result.classes).toHaveLength(1);
    expect(result.subjects).toHaveLength(1);
    expect(result.assignments).toHaveLength(1);
  });
});

describe('saveMatrix', () => {
  it('saves valid assignments and returns count', async () => {
    const mockDb = createMockDb();
    mockDb.limit.mockResolvedValue([{ id: 't-1' }]);
    mockDb.transaction = vi.fn((cb: any) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    }));
    const result = await saveMatrix({ db: mockDb, schoolId }, 'gl-1', [
      { classId: 'c-1', subjectId: 's-1', teacherId: 't-1' },
    ]);
    expect(result.saved).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for invalid teacher IDs', async () => {
    const mockDb = createMockDb();
    mockDb.limit.mockResolvedValue([]);
    mockDb.transaction = vi.fn((cb: any) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    }));
    const result = await saveMatrix({ db: mockDb, schoolId }, 'gl-1', [
      { classId: 'c-1', subjectId: 's-1', teacherId: 'bad-id' },
    ]);
    expect(result.saved).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npx vitest run tests/services/class-subject-teacher/class-subject-teacher.test.ts --reporter=verbose
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/services/class-subject-teacher/ apps/web/tests/services/class-subject-teacher/
git commit -m "feat(3.1.4): add class-subject-teacher services with tests"
```

---

### Task 3: API routes — GET + PUT

**Files:**
- Create: `apps/web/app/api/class-subject-teacher/route.ts`
- Create: `apps/web/tests/app/api/class-subject-teacher/route.test.ts`

**Interfaces:**
- Consumes: `getMatrix`, `saveMatrix`, `saveMatrixSchema` from service
- Produces: `GET` and `PUT` handlers

- [ ] **Step 1: Create route file**

`apps/web/app/api/class-subject-teacher/route.ts`:

```ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { getMatrix, saveMatrix, saveMatrixSchema } from '@/services/class-subject-teacher/class-subject-teacher';
import { db } from '@/lib/db';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId');
  const academicYearId = request.nextUrl.searchParams.get('academicYearId');
  if (!gradeLevelId) return apiError(400, 'gradeLevelId is required');
  if (!academicYearId) return apiError(400, 'academicYearId is required');

  const data = await getMatrix({ db, schoolId: tenant.schoolId }, gradeLevelId, academicYearId);
  return apiSuccess(data);
});

export const PUT = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json();
  const parsed = saveMatrixSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;

  const result = await saveMatrix({ db, schoolId: tenant.schoolId }, parsed.data.gradeLevelId, parsed.data.assignments);
  return apiSuccess(result);
});
```

- [ ] **Step 2: Create test file**

`apps/web/tests/app/api/class-subject-teacher/route.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'admin', schoolId, email: 'a@b.com', name: 'A' } }),
}));
vi.mock('@/lib/tenant/resolve', () => ({ resolveTenant: vi.fn().mockResolvedValue({ schoolId }) }));
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

const { GET, PUT } = await import('@/app/api/class-subject-teacher/route');

describe('GET /api/class-subject-teacher', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns 400 without gradeLevelId', async () => {
    const req = new NextRequest('http://localhost/api/class-subject-teacher');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns matrix data with valid params', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([]);
    db.orderBy.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/class-subject-teacher?gradeLevelId=gl-1&academicYearId=ay-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('PUT /api/class-subject-teacher', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns 422 for invalid body', async () => {
    const req = new NextRequest('http://localhost/api/class-subject-teacher', {
      method: 'PUT', body: JSON.stringify({}),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PUT(req);
    expect(res.status).toBe(422);
  });

  it('saves valid assignments', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([{ id: 't-1' }]);
    db.transaction = vi.fn((cb: any) => cb({
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    }));
    const req = new NextRequest('http://localhost/api/class-subject-teacher', {
      method: 'PUT',
      body: JSON.stringify({
        gradeLevelId: 'gl-1',
        assignments: [{ classId: 'c-1', subjectId: 's-1', teacherId: 't-1' }],
      }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PUT(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.saved).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/web && npx vitest run tests/app/api/class-subject-teacher/route.test.ts --reporter=verbose
```

Also run all class-subject-teacher tests:

```bash
cd apps/web && npx vitest run tests/services/class-subject-teacher/ tests/app/api/class-subject-teacher/ --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/class-subject-teacher/ apps/web/tests/app/api/class-subject-teacher/
git commit -m "feat(3.1.4): add class-subject-teacher API routes with tests"
```

---

### Task 4: UI — matrix page

**Files:**
- Create: `apps/web/app/(school)/admin/class-subject-teacher/page.tsx`
- Create: `apps/web/components/admin/class-subject-teacher/matrix-client.tsx`
- Modify: `apps/web/components/layouts/admin-sidebar.tsx`

- [ ] **Step 1: Create the server page**

`apps/web/app/(school)/admin/class-subject-teacher/page.tsx`:

```tsx
import { db } from '@/lib/db';
import { gradeLevels } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { MatrixClient } from '@/components/admin/class-subject-teacher/matrix-client';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function ClassSubjectTeacherPage() {
  const session = await requireRole('admin', 'super_admin');

  const gradeLevelList = await db.select({ id: gradeLevels.id, name: gradeLevels.name, code: gradeLevels.code })
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, session.user.schoolId!))
    .orderBy(gradeLevels.sortOrder);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class-Subject-Teacher Assignment"
        description="Assign teachers to subjects across classes in a grade level"
      />
      <MatrixClient gradeLevels={gradeLevelList} schoolId={session.user.schoolId!} />
    </div>
  );
}
```

- [ ] **Step 2: Create the matrix client**

`apps/web/components/admin/class-subject-teacher/matrix-client.tsx`:

```tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface GradeLevel {
  id: string;
  name: string;
  code: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  code: string | null;
}

interface SubjectCol {
  id: string;
  name: string;
  code: string;
  isCore: boolean;
}

interface Assignment {
  classId: string;
  subjectId: string;
  teacherId: string | null;
}

interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  gradeLevels: GradeLevel[];
  schoolId: string;
}

export function MatrixClient({ gradeLevels, schoolId }: Props) {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectCol[]>([]);
  const [assignments, setAssignments] = useState<Map<string, string | null>>(new Map());
  const [teachers, setTeachers] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/staff?role=teacher');
      const body = await res.json();
      if (body.success) setTeachers(body.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const loadMatrix = useCallback(async (gradeLevelId: string, ayId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/class-subject-teacher?gradeLevelId=${gradeLevelId}&academicYearId=${ayId}`);
      const body = await res.json();
      if (body.success) {
        setClasses(body.data.classes);
        setSubjects(body.data.subjects);
        const map = new Map<string, string | null>();
        for (const a of body.data.assignments) {
          map.set(`${a.classId}|${a.subjectId}`, a.teacherId);
        }
        setAssignments(map);
      }
    } catch {
      toast.error('Failed to load matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
    setAcademicYearId('');
    setClasses([]);
    setSubjects([]);
  };

  const handleAcademicYearChange = (value: string) => {
    setAcademicYearId(value);
    if (selectedGrade) loadMatrix(selectedGrade, value);
  };

  const setTeacher = (classId: string, subjectId: string, teacherId: string) => {
    const key = `${classId}|${subjectId}`;
    setAssignments((prev) => {
      const next = new Map(prev);
      next.set(key, teacherId || null);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      gradeLevelId: selectedGrade,
      assignments: Array.from(assignments.entries()).map(([key, teacherId]) => {
        const [classId, subjectId] = key.split('|');
        return { classId, subjectId, teacherId };
      }),
    };
    try {
      const res = await fetch('/api/class-subject-teacher', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (body.success) {
        toast.success(`Saved ${body.data.saved} assignments`);
        if (body.data.errors?.length > 0) {
          body.data.errors.forEach((e: any) => toast.error(`${e.classId}/${e.subjectId}: ${e.error}`));
        }
        loadMatrix(selectedGrade, academicYearId);
      } else {
        toast.error(body.error ?? 'Failed to save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="w-64">
          <Label htmlFor="grade">Grade Level</Label>
          <Select value={selectedGrade} onValueChange={handleGradeChange} items={gradeLevels.map((g) => ({ value: g.id, label: `${g.name}${g.code ? ` (${g.code})` : ''}` }))}>
            <SelectTrigger id="grade"><SelectValue placeholder="Select grade level" /></SelectTrigger>
            <SelectContent>
              {gradeLevels.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedGrade && (
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save All'}
          </Button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading matrix...</p>}

      {!loading && classes.length > 0 && subjects.length > 0 && (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white">Class</TableHead>
                  {subjects.map((sub) => (
                    <TableHead key={sub.id} className="min-w-44">
                      {sub.name}
                      {!sub.isCore && <span className="text-xs text-muted-foreground ml-1">(elective)</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="sticky left-0 bg-white font-medium">{cls.name}</TableCell>
                    {subjects.map((sub) => {
                      const key = `${cls.id}|${sub.id}`;
                      const teacherId = assignments.get(key) ?? '';
                      return (
                        <TableCell key={sub.id}>
                          <Select value={teacherId} onValueChange={(v: string) => setTeacher(cls.id, sub.id, v)} items={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!loading && selectedGrade && classes.length === 0 && (
        <p className="text-sm text-muted-foreground">No classes found for this grade level. Create classes first.</p>
      )}
    </div>
  );
}
```

Note: The matrix currently uses `selectedGrade` and needs an `academicYearId`. For simplicity in v1, you can hardcode the current academic year or fetch it. Let's adjust: the server page can pass the current academic year ID.

Actually, let me update the page to fetch the current academic year and pass it:

Update page.tsx to fetch current academic year:

```tsx
import { db } from '@/lib/db';
import { gradeLevels, academicYears } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { MatrixClient } from '@/components/admin/class-subject-teacher/matrix-client';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function ClassSubjectTeacherPage() {
  const session = await requireRole('admin', 'super_admin');

  const gradeLevelList = await db.select({ id: gradeLevels.id, name: gradeLevels.name, code: gradeLevels.code })
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, session.user.schoolId!))
    .orderBy(gradeLevels.sortOrder);

  const [currentYear] = await db.select({ id: academicYears.id })
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, session.user.schoolId!), eq(academicYears.isCurrent, true)))
    .limit(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class-Subject-Teacher Assignment"
        description="Assign teachers to subjects across classes in a grade level"
      />
      <MatrixClient
        gradeLevels={gradeLevelList}
        defaultAcademicYearId={currentYear?.id ?? ''}
      />
    </div>
  );
}
```

And update MatrixClient to use `defaultAcademicYearId`:

```tsx
// Remove the schoolId prop and academicYearId state
// Add defaultAcademicYearId prop, set it in useEffect
```

- [ ] **Step 3: Add nav item to admin sidebar**

In `apps/web/components/layouts/admin-sidebar.tsx`, add after the Academics item:

```ts
import { GitBranch } from 'lucide-react'; // or Grid3x3, LayoutGrid

{ href: "/admin/class-subject-teacher", label: "Subject Assign", icon: LayoutGrid },
```

Import `LayoutGrid` from `lucide-react` (or use an existing icon like `Grid3x3` if available).

Check what icons are already imported and add the new one.

- [ ] **Step 4: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(school)/admin/class-subject-teacher/ apps/web/components/admin/class-subject-teacher/ apps/web/components/layouts/admin-sidebar.tsx
git commit -m "feat(3.1.4): add class-subject-teacher matrix page and sidebar nav"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run all class-subject-teacher tests**

```bash
cd apps/web && npx vitest run tests/services/class-subject-teacher/ tests/app/api/class-subject-teacher/ --reporter=verbose
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Run lint**

```bash
cd apps/web && npx eslint . --max-warnings 0
```

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat(3.1.4): class-subject-teacher assignment matrix complete"
```
