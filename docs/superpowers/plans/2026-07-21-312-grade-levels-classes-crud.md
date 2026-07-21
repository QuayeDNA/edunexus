# [3.1.2] Grade Levels & Classes CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full CRUD for grade levels and classes within a school, matching [3.1.1] patterns.

**Architecture:** New service files (`services/grade-levels.ts`, `services/classes.ts`) + new API route files + UI dialogs. Follows same error handling and request/response shape as [3.1.1].

**Tech Stack:** Drizzle ORM, Next.js 16 App Router, Zod, Nova/shadcn components, TanStack Query (or raw fetch for simplicity, matching [3.1.1] pattern).

## Global Constraints

- All tenant-scoped queries include `schoolId` filter
- Services throw `AppError` subclasses; route handlers catch and return `apiError`
- Auth: `requireRole('admin')` on all mutation routes, `requireRole('admin', 'super_admin')` on reads
- Zod schemas export `createXSchema` and `updateXSchema` (all fields optional)
- Drizzle `.returning()` on all inserts/updates
- `id uuid primary key default gen_random_uuid()` pattern
- Follow existing [3.1.1] code style exactly (single quotes, no comments)
- Monetary values not applicable
- Dates: ISO 8601 UTC

---
**File Structure:**

```
Create:  apps/web/services/grade-levels.ts
Create:  apps/web/services/classes.ts
Modify:  packages/database/src/schema/grade-levels.ts     — add unique index + description
Modify:  packages/database/src/schema/classes.ts          — add unique index
Modify:  packages/shared/src/types/academics.ts           — align types with DB
Create:  apps/web/app/api/grade-levels/route.ts
Create:  apps/web/app/api/grade-levels/[id]/route.ts
Create:  apps/web/app/api/classes/route.ts
Create:  apps/web/app/api/classes/[id]/route.ts
Create:  apps/web/components/admin/academics/grade-levels-section.tsx
Create:  apps/web/components/admin/academics/create-grade-level-dialog.tsx
Create:  apps/web/components/admin/academics/edit-grade-level-dialog.tsx
Create:  apps/web/components/admin/academics/classes-section.tsx
Create:  apps/web/components/admin/academics/create-class-dialog.tsx
Create:  apps/web/components/admin/academics/edit-class-dialog.tsx
Modify:  apps/web/components/admin/academics/academics-client.tsx  — wire in sections
Create:  apps/web/tests/services/grade-levels.test.ts
Create:  apps/web/tests/services/classes.test.ts
Create:  apps/web/tests/app/api/grade-levels/route.test.ts
Create:  apps/web/tests/app/api/classes/route.test.ts
Modify:  apps/web/lib/api/errors.ts                       — not needed, reuse existing
Modify:  packages/database/src/seed.ts                    — add class for 2025/2026 year
```

---

### Task 1: Schema — add unique constraints + description field

**Files:**
- Modify: `packages/database/src/schema/grade-levels.ts`
- Modify: `packages/database/src/schema/classes.ts`

**Produces:** Updated tables with `uniqueIndex` on `(school_id, code)` for grade levels and `(school_id, grade_level_id, name)` for classes. `description` column on grade levels.

- [ ] **Step 1: Update grade-levels schema**

Add `description` column and unique index on `(school_id, code)`.

```ts
// In packages/database/src/schema/grade-levels.ts
import { uniqueIndex } from "drizzle-orm/pg-core";

// Add to columns:
description: text("description"),

// Add to table definition's second arg array:
uniqueIndex("idx_grade_levels_school_code").on(table.schoolId, table.code),
```

- [ ] **Step 2: Update classes schema**

Add unique index on `(school_id, grade_level_id, name)`.

```ts
// In packages/database/src/schema/classes.ts, add to table's second arg array:
uniqueIndex("idx_classes_school_grade_name").on(table.schoolId, table.gradeLevelId, table.name),
```

- [ ] **Step 3: Run migration**

```bash
cd packages/database && pnpm db:push
```

- [ ] **Step 4: Commit**

```bash
git add packages/database/src/schema/
git commit -m "feat(3.1.2): add unique constraints and description to grade_levels/classes schema"
```

---

### Task 2: Update shared types

**Files:**
- Modify: `packages/shared/src/types/academics.ts`

**Produces:** Aligned `GradeLevel` and `Class` interfaces matching actual DB schema.

- [ ] **Step 1: Update GradeLevel interface**

```ts
export interface GradeLevel {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  level: number;
  category: string;
  description?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Update Class interface**

```ts
export interface Class {
  id: string;
  schoolId: string;
  name: string;
  code?: string | null;
  gradeLevelId: string;
  academicYearId: string;
  homeroomTeacherId?: string | null;
  capacity?: number | null;
  roomNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/academics.ts
git commit -m "feat(3.1.2): align shared types for grade levels and classes"
```

---

### Task 3: Service — grade-levels.ts

**Files:**
- Create: `apps/web/services/grade-levels.ts`
- Test: `apps/web/tests/services/grade-levels.test.ts`

**Interfaces:**
- Consumes: `ServiceContext` from existing pattern `{ db: DatabaseClient; schoolId: string }`
- Produces: `listGradeLevels(ctx)`, `getGradeLevel(ctx, id)`, `createGradeLevel(ctx, data)`, `updateGradeLevel(ctx, id, data)`, `deleteGradeLevel(ctx, id)`

- [ ] **Step 1: Create service file with schemas and all CRUD functions**

```ts
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { gradeLevels, classes } from '@edunexus/database/src/schema';
import { NotFoundError, ConflictError, AppError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

const gradeLevelCategories = ['creche', 'nursery', 'kindergarten', 'primary', 'junior_secondary', 'senior_secondary'] as const;

export const createGradeLevelSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(100),
  level: z.coerce.number().int().min(0, 'Level must be 0 or greater'),
  category: z.enum(gradeLevelCategories),
  sortOrder: z.coerce.number().int().min(0).optional(),
  description: z.string().max(500).optional(),
});

export const updateGradeLevelSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  level: z.coerce.number().int().min(0).optional(),
  category: z.enum(gradeLevelCategories).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  description: z.string().max(500).optional(),
});

export async function listGradeLevels(ctx: ServiceContext) {
  const rows = await ctx.db.select({
    id: gradeLevels.id,
    schoolId: gradeLevels.schoolId,
    code: gradeLevels.code,
    name: gradeLevels.name,
    level: gradeLevels.level,
    category: gradeLevels.category,
    description: gradeLevels.description,
    sortOrder: gradeLevels.sortOrder,
    classCount: sql<number>`coalesce(count(${classes.id}) filter (where ${classes.deletedAt} is null), 0)`,
  }).from(gradeLevels)
    .leftJoin(classes, and(
      eq(classes.gradeLevelId, gradeLevels.id),
      eq(classes.schoolId, ctx.schoolId),
    ))
    .where(eq(gradeLevels.schoolId, ctx.schoolId))
    .groupBy(gradeLevels.id)
    .orderBy(gradeLevels.sortOrder);
  return rows;
}

export async function getGradeLevel(ctx: ServiceContext, id: string) {
  const [row] = await ctx.db.select({
    id: gradeLevels.id,
    schoolId: gradeLevels.schoolId,
    code: gradeLevels.code,
    name: gradeLevels.name,
    level: gradeLevels.level,
    category: gradeLevels.category,
    description: gradeLevels.description,
    sortOrder: gradeLevels.sortOrder,
    createdAt: gradeLevels.createdAt,
    updatedAt: gradeLevels.updatedAt,
    classCount: sql<number>`coalesce(count(${classes.id}) filter (where ${classes.deletedAt} is null), 0)`,
  }).from(gradeLevels)
    .leftJoin(classes, and(
      eq(classes.gradeLevelId, gradeLevels.id),
      eq(classes.schoolId, ctx.schoolId),
    ))
    .where(and(eq(gradeLevels.id, id), eq(gradeLevels.schoolId, ctx.schoolId)))
    .groupBy(gradeLevels.id)
    .limit(1);
  if (!row) throw new NotFoundError('Grade level');
  return row;
}

export async function createGradeLevel(ctx: ServiceContext, data: z.infer<typeof createGradeLevelSchema>) {
  const [existing] = await ctx.db.select({ id: gradeLevels.id }).from(gradeLevels)
    .where(and(eq(gradeLevels.schoolId, ctx.schoolId), eq(gradeLevels.code, data.code)))
    .limit(1);
  if (existing) throw new ConflictError('A grade level with this code already exists');
  const [created] = await ctx.db.insert(gradeLevels).values({
    schoolId: ctx.schoolId,
    code: data.code,
    name: data.name,
    level: data.level,
    category: data.category,
    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    ...(data.description !== undefined && { description: data.description }),
  }).returning();
  return created;
}

export async function updateGradeLevel(ctx: ServiceContext, id: string, data: z.infer<typeof updateGradeLevelSchema>) {
  const [existing] = await ctx.db.select().from(gradeLevels)
    .where(and(eq(gradeLevels.id, id), eq(gradeLevels.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Grade level');
  if (data.code && data.code !== existing.code) {
    const [duplicate] = await ctx.db.select({ id: gradeLevels.id }).from(gradeLevels)
      .where(and(eq(gradeLevels.schoolId, ctx.schoolId), eq(gradeLevels.code, data.code)))
      .limit(1);
    if (duplicate) throw new ConflictError('A grade level with this code already exists');
  }
  const [updated] = await ctx.db.update(gradeLevels).set({
    ...(data.code !== undefined && { code: data.code }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.level !== undefined && { level: data.level }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    ...(data.description !== undefined && { description: data.description }),
    updatedAt: new Date(),
  }).where(and(eq(gradeLevels.id, id), eq(gradeLevels.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}

export async function deleteGradeLevel(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select({ id: gradeLevels.id }).from(gradeLevels)
    .where(and(eq(gradeLevels.id, id), eq(gradeLevels.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Grade level');
  const [classCount] = await ctx.db.select({ count: sql<number>`count(*)` }).from(classes)
    .where(and(eq(classes.gradeLevelId, id), eq(classes.schoolId, ctx.schoolId), sql`${classes.deletedAt} is null`));
  if (Number(classCount.count) > 0) {
    throw new ConflictError('Cannot delete grade level with existing classes. Delete the classes first.');
  }
  const [deleted] = await ctx.db.delete(gradeLevels)
    .where(and(eq(gradeLevels.id, id), eq(gradeLevels.schoolId, ctx.schoolId)))
    .returning({ id: gradeLevels.id });
  if (!deleted) throw new NotFoundError('Grade level');
  return { deleted: true };
}
```

- [ ] **Step 2: Create service tests**

```ts
// tests/services/grade-levels.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { listGradeLevels, getGradeLevel, createGradeLevel, updateGradeLevel, deleteGradeLevel } from '@/services/grade-levels';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

vi.mock('@edunexus/database/src/schema', () => ({}));

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
}

const schoolId = 'school-1';
const mockGradeLevel = {
  id: 'gl-1', schoolId, code: 'P1', name: 'Primary 1', level: 5,
  category: 'primary', description: null, sortOrder: 5,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('GradeLevelService', () => {
  describe('listGradeLevels', () => {
    it('returns ordered grade levels with class count', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([
        { ...mockGradeLevel, classCount: 2 },
        { ...mockGradeLevel, id: 'gl-2', code: 'P2', name: 'Primary 2', level: 6, sortOrder: 6, classCount: 1 },
      ]);
      const result = await listGradeLevels({ db: mockDb, schoolId });
      expect(result).toHaveLength(2);
      expect(result[0].classCount).toBe(2);
    });
  });

  describe('getGradeLevel', () => {
    it('returns grade level with class count', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ ...mockGradeLevel, classCount: 2 }]);
      const result = await getGradeLevel({ db: mockDb, schoolId }, 'gl-1');
      expect(result.id).toBe('gl-1');
      expect(result.classCount).toBe(2);
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getGradeLevel({ db: mockDb, schoolId }, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createGradeLevel', () => {
    it('creates a grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      mockDb.returning.mockResolvedValue([mockGradeLevel]);
      const result = await createGradeLevel({ db: mockDb, schoolId }, {
        code: 'P1', name: 'Primary 1', level: 5, category: 'primary',
      });
      expect(result.id).toBe('gl-1');
    });
    it('rejects duplicate code', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockGradeLevel]);
      await expect(createGradeLevel({ db: mockDb, schoolId }, {
        code: 'P1', name: 'Primary 1', level: 5, category: 'primary',
      })).rejects.toThrow(ConflictError);
    });
  });

  describe('updateGradeLevel', () => {
    it('updates a grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockGradeLevel]);
      mockDb.returning.mockResolvedValue([{ ...mockGradeLevel, name: 'Primary 1 Updated' }]);
      const result = await updateGradeLevel({ db: mockDb, schoolId }, 'gl-1', { name: 'Primary 1 Updated' });
      expect(result.name).toBe('Primary 1 Updated');
    });
    it('rejects changing to an existing code', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([mockGradeLevel])
        .mockResolvedValueOnce([{ id: 'gl-2', code: 'P2' }]);
      await expect(updateGradeLevel({ db: mockDb, schoolId }, 'gl-1', { code: 'P2' })).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteGradeLevel', () => {
    it('deletes a grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockGradeLevel]);
      mockDb.where.mockResolvedValueOnce([{ count: '0' }]);
      mockDb.returning.mockResolvedValue([{ id: 'gl-1' }]);
      const result = await deleteGradeLevel({ db: mockDb, schoolId }, 'gl-1');
      expect(result.deleted).toBe(true);
    });
    it('rejects if classes exist', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockGradeLevel]);
      mockDb.where.mockResolvedValueOnce([{ count: '3' }]);
      await expect(deleteGradeLevel({ db: mockDb, schoolId }, 'gl-1')).rejects.toThrow(ConflictError);
    });
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/grade-levels.test.ts --reporter=verbose
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/grade-levels.ts apps/web/tests/services/grade-levels.test.ts
git commit -m "feat(3.1.2): add grade levels service with tests"
```

---

### Task 4: Service — classes.ts

**Files:**
- Create: `apps/web/services/classes.ts`
- Test: `apps/web/tests/services/classes.test.ts`

**Interfaces:**
- Consumes: same `ServiceContext`
- Produces: `listClasses(ctx, gradeLevelId)`, `getClass(ctx, id)`, `createClass(ctx, data)`, `updateClass(ctx, id, data)`, `deleteClass(ctx, id)`

- [ ] **Step 1: Create service file**

```ts
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { classes, gradeLevels, academicYears, staff } from '@edunexus/database/src/schema';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

interface ServiceContext { db: any; schoolId: string; }

export const createClassSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().max(20).optional(),
  gradeLevelId: z.string().uuid('Invalid grade level'),
  academicYearId: z.string().uuid('Invalid academic year'),
  homeroomTeacherId: z.string().uuid().optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  roomNumber: z.string().max(20).optional(),
});

export const updateClassSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(20).optional(),
  gradeLevelId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  homeroomTeacherId: z.string().uuid().optional().nullable(),
  capacity: z.coerce.number().int().min(0).optional(),
  roomNumber: z.string().max(20).optional().nullable(),
});

async function validateClassRefs(ctx: ServiceContext, data: { gradeLevelId?: string; academicYearId?: string; homeroomTeacherId?: string | null }) {
  if (data.gradeLevelId) {
    const [gl] = await ctx.db.select({ id: gradeLevels.id }).from(gradeLevels)
      .where(and(eq(gradeLevels.id, data.gradeLevelId), eq(gradeLevels.schoolId, ctx.schoolId)))
      .limit(1);
    if (!gl) throw new NotFoundError('Grade level');
  }
  if (data.academicYearId) {
    const [ay] = await ctx.db.select({ id: academicYears.id }).from(academicYears)
      .where(and(eq(academicYears.id, data.academicYearId), eq(academicYears.schoolId, ctx.schoolId)))
      .limit(1);
    if (!ay) throw new NotFoundError('Academic year');
  }
  if (data.homeroomTeacherId) {
    const [t] = await ctx.db.select({ id: staff.id }).from(staff)
      .where(and(eq(staff.id, data.homeroomTeacherId), eq(staff.schoolId, ctx.schoolId)))
      .limit(1);
    if (!t) throw new NotFoundError('Teacher');
  }
}

export async function listClasses(ctx: ServiceContext, gradeLevelId: string) {
  const rows = await ctx.db.select({
    id: classes.id,
    schoolId: classes.schoolId,
    name: classes.name,
    code: classes.code,
    gradeLevelId: classes.gradeLevelId,
    academicYearId: classes.academicYearId,
    homeroomTeacherId: classes.homeroomTeacherId,
    capacity: classes.capacity,
    roomNumber: classes.roomNumber,
    gradeLevelName: gradeLevels.name,
  }).from(classes)
    .leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
    .where(and(
      eq(classes.schoolId, ctx.schoolId),
      eq(classes.gradeLevelId, gradeLevelId),
      sql`${classes.deletedAt} is null`,
    ))
    .orderBy(classes.name);
  return rows;
}

export async function getClass(ctx: ServiceContext, id: string) {
  const [row] = await ctx.db.select({
    id: classes.id,
    schoolId: classes.schoolId,
    name: classes.name,
    code: classes.code,
    gradeLevelId: classes.gradeLevelId,
    academicYearId: classes.academicYearId,
    homeroomTeacherId: classes.homeroomTeacherId,
    capacity: classes.capacity,
    roomNumber: classes.roomNumber,
    gradeLevelName: gradeLevels.name,
    createdAt: classes.createdAt,
    updatedAt: classes.updatedAt,
  }).from(classes)
    .leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
    .where(and(eq(classes.id, id), eq(classes.schoolId, ctx.schoolId), sql`${classes.deletedAt} is null`))
    .limit(1);
  if (!row) throw new NotFoundError('Class');
  return row;
}

export async function createClass(ctx: ServiceContext, data: z.infer<typeof createClassSchema>) {
  await validateClassRefs(ctx, { gradeLevelId: data.gradeLevelId, academicYearId: data.academicYearId, homeroomTeacherId: data.homeroomTeacherId });
  const [existing] = await ctx.db.select({ id: classes.id }).from(classes)
    .where(and(
      eq(classes.schoolId, ctx.schoolId),
      eq(classes.gradeLevelId, data.gradeLevelId),
      eq(classes.name, data.name),
      sql`${classes.deletedAt} is null`,
    ))
    .limit(1);
  if (existing) throw new ConflictError('A class with this name already exists in this grade level');
  const [created] = await ctx.db.insert(classes).values({
    schoolId: ctx.schoolId,
    name: data.name,
    code: data.code ?? null,
    gradeLevelId: data.gradeLevelId,
    academicYearId: data.academicYearId,
    homeroomTeacherId: data.homeroomTeacherId ?? null,
    capacity: data.capacity ?? null,
    roomNumber: data.roomNumber ?? null,
  }).returning();
  return created;
}

export async function updateClass(ctx: ServiceContext, id: string, data: z.infer<typeof updateClassSchema>) {
  const [existing] = await ctx.db.select().from(classes)
    .where(and(eq(classes.id, id), eq(classes.schoolId, ctx.schoolId), sql`${classes.deletedAt} is null`))
    .limit(1);
  if (!existing) throw new NotFoundError('Class');
  const resolvedGradeLevelId = data.gradeLevelId ?? existing.gradeLevelId;
  const resolvedAcademicYearId = data.academicYearId ?? existing.academicYearId;
  await validateClassRefs(ctx, {
    gradeLevelId: resolvedGradeLevelId,
    academicYearId: resolvedAcademicYearId,
    homeroomTeacherId: data.homeroomTeacherId,
  });
  if (data.name && data.name !== existing.name) {
    const [duplicate] = await ctx.db.select({ id: classes.id }).from(classes)
      .where(and(
        eq(classes.schoolId, ctx.schoolId),
        eq(classes.gradeLevelId, resolvedGradeLevelId),
        eq(classes.name, data.name),
        sql`${classes.deletedAt} is null`,
      ))
      .limit(1);
    if (duplicate) throw new ConflictError('A class with this name already exists in this grade level');
  }
  const [updated] = await ctx.db.update(classes).set({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.code !== undefined && { code: data.code }),
    ...(data.gradeLevelId !== undefined && { gradeLevelId: data.gradeLevelId }),
    ...(data.academicYearId !== undefined && { academicYearId: data.academicYearId }),
    ...(data.homeroomTeacherId !== undefined && { homeroomTeacherId: data.homeroomTeacherId }),
    ...(data.capacity !== undefined && { capacity: data.capacity }),
    ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
    updatedAt: new Date(),
  }).where(and(eq(classes.id, id), eq(classes.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}

export async function deleteClass(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select({ id: classes.id }).from(classes)
    .where(and(eq(classes.id, id), eq(classes.schoolId, ctx.schoolId), sql`${classes.deletedAt} is null`))
    .limit(1);
  if (!existing) throw new NotFoundError('Class');
  const [deleted] = await ctx.db.update(classes).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(classes.id, id), eq(classes.schoolId, ctx.schoolId)))
    .returning({ id: classes.id });
  return { deleted: true };
}
```

- [ ] **Step 2: Create service tests**

```ts
// tests/services/classes.test.ts
import { vi, describe, it, expect } from 'vitest';
import { listClasses, getClass, createClass, updateClass, deleteClass } from '@/services/classes';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

vi.mock('@edunexus/database/src/schema', () => ({}));

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
}

const schoolId = 'school-1';
const mockClass = {
  id: 'c-1', schoolId, name: 'Class 1A', code: 'P1-A',
  gradeLevelId: 'gl-1', academicYearId: 'ay-1',
  homeroomTeacherId: null, capacity: 40, roomNumber: null,
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
};

describe('ClassService', () => {
  describe('listClasses', () => {
    it('returns classes for a grade level with grade level name', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([
        { ...mockClass, gradeLevelName: 'Primary 1' },
      ]);
      const result = await listClasses({ db: mockDb, schoolId }, 'gl-1');
      expect(result).toHaveLength(1);
      expect(result[0].gradeLevelName).toBe('Primary 1');
    });
  });

  describe('getClass', () => {
    it('returns a single class', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([{ ...mockClass, gradeLevelName: 'Primary 1' }]);
      const result = await getClass({ db: mockDb, schoolId }, 'c-1');
      expect(result.id).toBe('c-1');
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getClass({ db: mockDb, schoolId }, 'missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createClass', () => {
    it('creates a class with valid data', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'gl-1' }])    // grade level exists
        .mockResolvedValueOnce([{ id: 'ay-1' }])     // academic year exists
        .mockResolvedValueOnce([]);                   // no duplicate name
      mockDb.returning.mockResolvedValue([mockClass]);
      const result = await createClass({ db: mockDb, schoolId }, {
        name: 'Class 1A', gradeLevelId: 'gl-1', academicYearId: 'ay-1',
      });
      expect(result.id).toBe('c-1');
    });
    it('rejects duplicate name within grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([{ id: 'gl-1' }])
        .mockResolvedValueOnce([{ id: 'ay-1' }])
        .mockResolvedValueOnce([mockClass]);
      await expect(createClass({ db: mockDb, schoolId }, {
        name: 'Class 1A', gradeLevelId: 'gl-1', academicYearId: 'ay-1',
      })).rejects.toThrow(ConflictError);
    });
    it('rejects invalid grade level', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([]); // grade level not found
      await expect(createClass({ db: mockDb, schoolId }, {
        name: 'Bad', gradeLevelId: 'bad-gl', academicYearId: 'ay-1',
      })).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateClass', () => {
    it('updates a class name', async () => {
      const mockDb = createMockDb();
      mockDb.limit
        .mockResolvedValueOnce([mockClass])           // existing class
        .mockResolvedValueOnce([]);                    // no duplicate name
      mockDb.returning.mockResolvedValue([{ ...mockClass, name: 'Updated' }]);
      const result = await updateClass({ db: mockDb, schoolId }, 'c-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteClass', () => {
    it('soft deletes a class', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockClass]);
      mockDb.returning.mockResolvedValue([{ id: 'c-1' }]);
      const result = await deleteClass({ db: mockDb, schoolId }, 'c-1');
      expect(result.deleted).toBe(true);
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(deleteClass({ db: mockDb, schoolId }, 'missing')).rejects.toThrow(NotFoundError);
    });
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/classes.test.ts --reporter=verbose
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/classes.ts apps/web/tests/services/classes.test.ts
git commit -m "feat(3.1.2): add classes service with tests"
```

---

### Task 5: API routes — grade-levels

**Files:**
- Create: `apps/web/app/api/grade-levels/route.ts`
- Create: `apps/web/app/api/grade-levels/[id]/route.ts`

**Interfaces:**
- Consumes: service functions from Task 3
- Produces: REST endpoints for grade level CRUD

- [ ] **Step 1: Create collection route**

```ts
// apps/web/app/api/grade-levels/route.ts
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listGradeLevels, createGradeLevel, createGradeLevelSchema } from '@/services/grade-levels';
import { AppError } from '@/lib/api/errors';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  try {
    const data = await listGradeLevels({ db, schoolId: tenant.schoolId });
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = createGradeLevelSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const data = await createGradeLevel({ db, schoolId: tenant.schoolId }, parsed.data);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
```

- [ ] **Step 2: Create [id] route**

```ts
// apps/web/app/api/grade-levels/[id]/route.ts
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { getGradeLevel, updateGradeLevel, deleteGradeLevel, updateGradeLevelSchema } from '@/services/grade-levels';
import { AppError } from '@/lib/api/errors';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const { id } = await params;
  try {
    const data = await getGradeLevel({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const { id } = await params;
  const body = await request.json();
  const parsed = updateGradeLevelSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const data = await updateGradeLevel({ db, schoolId: tenant.schoolId }, id, parsed.data);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const { id } = await params;
  try {
    const data = await deleteGradeLevel({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
```

- [ ] **Step 3: Create API route tests**

```ts
// tests/app/api/grade-levels/route.test.ts
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
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue([{ id: 'new-id' }]),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/grade-levels/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/grade-levels/[id]/route');

describe('GET /api/grade-levels', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns list of grade levels', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'gl-1', name: 'Primary 1', classCount: 2, schoolId }]);
    const req = new NextRequest('http://localhost/api/grade-levels');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/grade-levels', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/grade-levels', {
      method: 'POST',
      body: JSON.stringify({ code: 'P1', name: 'Primary 1', level: 5, category: 'primary' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
  it('returns 400 for invalid data', async () => {
    const req = new NextRequest('http://localhost/api/grade-levels', {
      method: 'POST', body: JSON.stringify({ code: '' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/grade-levels/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([{ id: 'gl-1', name: 'Primary 1', classCount: 2, schoolId }]);
    const req = new NextRequest('http://localhost/api/grade-levels/gl-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await detailGET(req, { params: Promise.resolve({ id: 'gl-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('PATCH /api/grade-levels/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'gl-1', code: 'P1', schoolId }]);
    db.limit.mockResolvedValueOnce([{ id: 'gl-1', code: 'P1', schoolId }]); // for validateClassRefs equivalent
    db.returning.mockResolvedValue([{ id: 'gl-1', name: 'Updated' }]);
    const req = new NextRequest('http://localhost/api/grade-levels/gl-1', {
      method: 'PATCH', body: JSON.stringify({ name: 'Updated' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'gl-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('DELETE /api/grade-levels/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('deletes a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'gl-1', schoolId }]);
    db.where.mockResolvedValueOnce([{ count: '0' }]);
    db.returning.mockResolvedValue([{ id: 'gl-1' }]);
    const req = new NextRequest('http://localhost/api/grade-levels/gl-1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'gl-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/grade-levels.test.ts tests/app/api/grade-levels/route.test.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/grade-levels/
git add apps/web/tests/app/api/grade-levels/
git commit -m "feat(3.1.2): add grade levels API routes with tests"
```

---

### Task 6: API routes — classes

**Files:**
- Create: `apps/web/app/api/classes/route.ts`
- Create: `apps/web/app/api/classes/[id]/route.ts`

- [ ] **Step 1: Create collection route** (same pattern as Task 5, with `?gradeLevelId=` query param for GET)

```ts
// apps/web/app/api/classes/route.ts
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listClasses, createClass, createClassSchema } from '@/services/classes';
import { AppError } from '@/lib/api/errors';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId');
  if (!gradeLevelId) return apiError(400, 'gradeLevelId query parameter is required');
  try {
    const data = await listClasses({ db, schoolId: tenant.schoolId }, gradeLevelId);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const data = await createClass({ db, schoolId: tenant.schoolId }, parsed.data);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
```

- [ ] **Step 2: Create [id] route** (same pattern as Task 5 step 2)

```ts
// apps/web/app/api/classes/[id]/route.ts
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { getClass, updateClass, deleteClass, updateClassSchema } from '@/services/classes';
import { AppError } from '@/lib/api/errors';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const { id } = await params;
  try {
    const data = await getClass({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const { id } = await params;
  const body = await request.json();
  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const data = await updateClass({ db, schoolId: tenant.schoolId }, id, parsed.data);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const { id } = await params;
  try {
    const data = await deleteClass({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
```

- [ ] **Step 3: Create API route tests**

```ts
// tests/app/api/classes/route.test.ts
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
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/classes/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/classes/[id]/route');

describe('GET /api/classes', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns 400 if gradeLevelId missing', async () => {
    const req = new NextRequest('http://localhost/api/classes');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    expect(res.status).toBe(400);
  });
  it('returns classes for a valid gradeLevelId', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'c-1', name: 'Class 1A', gradeLevelName: 'Primary 1', schoolId }]);
    const req = new NextRequest('http://localhost/api/classes?gradeLevelId=gl-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/classes', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a class with valid data', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: 'gl-1' }])
      .mockResolvedValueOnce([{ id: 'ay-1' }])
      .mockResolvedValueOnce([]);
    db.returning.mockResolvedValue([{ id: 'c-1', name: 'Class 1A', schoolId }]);
    const req = new NextRequest('http://localhost/api/classes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Class 1A', gradeLevelId: 'gl-1', academicYearId: 'ay-1' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Class 1A');
  });
});

describe('PATCH /api/classes/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a class', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit
      .mockResolvedValueOnce([{ id: 'c-1', name: 'Class 1A', gradeLevelId: 'gl-1', schoolId, academicYearId: 'ay-1' }])
      .mockResolvedValueOnce([]);
    db.returning.mockResolvedValue([{ id: 'c-1', name: 'Updated', schoolId }]);
    const req = new NextRequest('http://localhost/api/classes/c-1', {
      method: 'PATCH', body: JSON.stringify({ name: 'Updated' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'c-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated');
  });
});

describe('DELETE /api/classes/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('soft deletes a class', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'c-1', schoolId }]);
    db.returning.mockResolvedValue([{ id: 'c-1' }]);
    const req = new NextRequest('http://localhost/api/classes/c-1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'c-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });
});

- [ ] **Step 4: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/classes.test.ts tests/app/api/classes/route.test.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/classes/
git add apps/web/tests/app/api/classes/
git commit -m "feat(3.1.2): add classes API routes with tests"
```

---

### Task 7: UI — Grade levels section

**Files:**
- Create: `apps/web/components/admin/academics/grade-levels-section.tsx`
- Create: `apps/web/components/admin/academics/create-grade-level-dialog.tsx`
- Create: `apps/web/components/admin/academics/edit-grade-level-dialog.tsx`
- Modify: `apps/web/components/admin/academics/academics-client.tsx`

- [ ] **Step 1: Create grade-levels-section.tsx**

List grade levels with class count, edit/delete buttons. Reuse existing EmptyState when empty. Expandable to show classes inline or drill-in link.

- [ ] **Step 2: Create create-grade-level-dialog.tsx**

Modal with Nova Dialog: code, name, level (number), category (select from enum), sortOrder (number), description (textarea).

- [ ] **Step 3: Create edit-grade-level-dialog.tsx**

Same form pre-filled, PATCH on submit.

- [ ] **Step 4: Wire into academics-client.tsx**

Insert `<GradeLevelsSection>` below the academic years section.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/academics/
git commit -m "feat(3.1.2): add grade level UI components"
```

---

### Task 8: UI — Classes section

**Files:**
- Create: `apps/web/components/admin/academics/classes-section.tsx`
- Create: `apps/web/components/admin/academics/create-class-dialog.tsx`
- Create: `apps/web/components/admin/academics/edit-class-dialog.tsx`

- [ ] **Step 1: Create classes-section.tsx**

List classes for a selected grade level, with create/edit/delete. Shows name, code, capacity, teacher, room number.

- [ ] **Step 2: Create create-class-dialog.tsx**

Form: name, code (optional), gradeLevelId (select, pre-filled from context), academicYearId (select), homeroomTeacherId (select, optional), capacity (number), roomNumber.

- [ ] **Step 3: Create edit-class-dialog.tsx**

Same form pre-filled, PATCH on submit.

- [ ] **Step 4: Wire into grade-levels-section.tsx or academics-client.tsx**

Add class list/actions below each grade level row, expandable.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/academics/
git commit -m "feat(3.1.2): add class UI components"
```

---

### Task 9: Seed — add classes for 2025/2026 academic year

**Files:**
- Modify: `packages/database/src/seed.ts`

- [ ] **Step 1: After creating 2025/2026 year terms, also create classes**

Copy the class seeding logic that exists for the 2024/2025 year and replicate it for the 2025/2026 year, using the newly created academic year's ID.

- [ ] **Step 2: Commit**

```bash
git add packages/database/src/seed.ts
git commit -m "feat(3.1.2): seed classes for 2025/2026 academic year"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run all tests**

```bash
cd apps/web && npx vitest run --reporter=verbose
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Fix any issues**

- [ ] **Step 4: Final commit**

```bash
git commit -m "chore: final typecheck and test pass for [3.1.2]"
```

- [ ] **Step 5: Push**

```bash
git push
```
