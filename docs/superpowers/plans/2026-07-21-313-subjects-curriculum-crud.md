# [3.1.3] Subjects & Curriculum CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD for subjects, subject-to-grade-level mapping (core/elective), and curriculum groupings within a school.

**Architecture:** New schema tables (`subject_grade_levels`, `curricula`, `curriculum_subjects`) + add `description` to `subjects`. Three new service files, seven API route files, six UI components. Follows [3.1.2] embedded-section pattern — subjects and curricula are new sections within the existing Academics admin page.

**Tech Stack:** Drizzle ORM, Next.js 16 App Router, Zod, Nova/shadcn components, TanStack Query, Vitest.

## Global Constraints

- All tenant-scoped queries include `schoolId` filter (multi-tenant shared DB)
- Services throw `AppError` subclasses; route handlers use `routeHandler()` wrapper for centralized catch
- Auth: `requireRole('admin')` on mutations, `requireRole('admin', 'super_admin')` on reads
- Zod schemas export `createXSchema` and `updateXSchema` (all fields optional on update)
- Drizzle `.returning()` on all inserts/updates
- `id uuid primary key default gen_random_uuid()` pattern
- Follow existing [3.1.2] code style exactly (single quotes, no comments)
- Dates: ISO 8601 UTC
- Use `routeHandler()` wrapper from `@/lib/api/handler` — throw typed errors, don't return `apiError()` inline
- Import from `@edunexus/database` never `@edunexus/database/src/schema`

---
**File Structure:**

```
Create:  packages/database/src/schema/subject-grade-levels.ts
Create:  packages/database/src/schema/curricula.ts
Create:  packages/database/src/schema/curriculum-subjects.ts
Modify:  packages/database/src/schema/index.ts          — export new tables
Modify:  packages/database/src/schema/subjects.ts        — add description column
Modify:  packages/shared/src/types/academics.ts          — add SubjectGradeLevel, Curriculum types, align Subject
Create:  apps/web/services/subjects.ts
Create:  apps/web/services/subject-grade-levels.ts
Create:  apps/web/services/curricula.ts
Create:  apps/web/app/api/subjects/route.ts
Create:  apps/web/app/api/subjects/[id]/route.ts
Create:  apps/web/app/api/subject-grade-levels/route.ts
Create:  apps/web/app/api/subject-grade-levels/[id]/toggle-core/route.ts
Create:  apps/web/app/api/curricula/route.ts
Create:  apps/web/app/api/curricula/[id]/route.ts
Create:  apps/web/app/api/curricula/[id]/subjects/route.ts
Create:  apps/web/components/admin/academics/subjects-section.tsx
Create:  apps/web/components/admin/academics/create-subject-dialog.tsx
Create:  apps/web/components/admin/academics/edit-subject-dialog.tsx
Create:  apps/web/components/admin/academics/curricula-section.tsx
Create:  apps/web/components/admin/academics/create-curriculum-dialog.tsx
Create:  apps/web/components/admin/academics/edit-curriculum-dialog.tsx
Modify:  apps/web/components/admin/academics/academics-client.tsx  — wire in new sections
Create:  apps/web/tests/services/subjects.test.ts
Create:  apps/web/tests/services/subject-grade-levels.test.ts
Create:  apps/web/tests/services/curricula.test.ts
Create:  apps/web/tests/app/api/subjects/route.test.ts
Create:  apps/web/tests/app/api/subject-grade-levels/route.test.ts
Create:  apps/web/tests/app/api/curricula/route.test.ts
Modify:  packages/database/src/seed.ts
```

---

### Task 1: Schema — add `description` to subjects + create new tables

**Files:**
- Modify: `packages/database/src/schema/subjects.ts`
- Create: `packages/database/src/schema/subject-grade-levels.ts`
- Create: `packages/database/src/schema/curricula.ts`
- Create: `packages/database/src/schema/curriculum-subjects.ts`
- Modify: `packages/database/src/schema/index.ts`

**Interfaces:**
- Consumes: existing `schools`, `subjects`, `gradeLevels` table schemas from `@edunexus/database`
- Produces: four exportable table definitions for `subjectGradeLevels`, `curricula`, `curriculumSubjects`; updated `subjects` with `description` column

- [ ] **Step 1: Add description to subjects table**

```ts
// In packages/database/src/schema/subjects.ts
import { text } from "drizzle-orm/pg-core";

// Add to columns, after category:
description: text("description"),
```

- [ ] **Step 2: Create subject-grade-levels.ts**

```ts
import { pgTable, uuid, timestamp, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { subjects } from "./subjects";
import { gradeLevels } from "./grade-levels";

export const subjectGradeLevels = pgTable(
  "subject_grade_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id),
    gradeLevelId: uuid("grade_level_id").notNull().references(() => gradeLevels.id),
    isCore: boolean("is_core").notNull().default(true),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_sgl_school_id").on(table.schoolId),
    index("idx_sgl_grade_level_id").on(table.gradeLevelId),
    uniqueIndex("idx_sgl_school_subject_grade").on(table.schoolId, table.subjectId, table.gradeLevelId),
  ],
);
```

- [ ] **Step 3: Create curricula.ts**

```ts
import { pgTable, uuid, timestamp, varchar, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_curricula_school_id").on(table.schoolId),
    uniqueIndex("idx_curricula_school_code").on(table.schoolId, table.code),
  ],
);
```

- [ ] **Step 4: Create curriculum-subjects.ts**

```ts
import { pgTable, uuid, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { curricula } from "./curricula";
import { subjects } from "./subjects";

export const curriculumSubjects = pgTable(
  "curriculum_subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id").notNull().references(() => schools.id),
    curriculumId: uuid("curriculum_id").notNull().references(() => curricula.id),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_cs_curriculum_id").on(table.curriculumId),
    uniqueIndex("idx_cs_school_curriculum_subject").on(table.schoolId, table.curriculumId, table.subjectId),
  ],
);
```

- [ ] **Step 5: Update index.ts**

```ts
// Add to packages/database/src/schema/index.ts:
export { subjectGradeLevels } from "./subject-grade-levels";
export { curricula } from "./curricula";
export { curriculumSubjects } from "./curriculum-subjects";
```

- [ ] **Step 6: Run migration**

```bash
cd packages/database && pnpm db:push
```

- [ ] **Step 7: Commit**

```bash
git add packages/database/src/schema/subjects.ts
git add packages/database/src/schema/subject-grade-levels.ts
git add packages/database/src/schema/curricula.ts
git add packages/database/src/schema/curriculum-subjects.ts
git add packages/database/src/schema/index.ts
git commit -m "feat(3.1.3): add subject-grade-levels, curricula, curriculum-subjects schema"
```

---

### Task 2: Update shared types

**Files:**
- Modify: `packages/shared/src/types/academics.ts`

**Interfaces:**
- Consumes: schema definitions from Task 1
- Produces: `Subject`, `SubjectGradeLevel`, `Curriculum` interfaces matching DB

- [ ] **Step 1: Update Subject interface**

```ts
export interface Subject {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  category?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Add SubjectGradeLevel interface**

```ts
export interface SubjectGradeLevel {
  id: string;
  schoolId: string;
  subjectId: string;
  gradeLevelId: string;
  isCore: boolean;
  sortOrder?: number | null;
  subjectCode?: string;
  subjectName?: string;
}
```

- [ ] **Step 3: Add Curriculum interface**

```ts
export interface Curriculum {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  description?: string | null;
  subjectCount?: number;
  subjects?: Subject[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/academics.ts
git commit -m "feat(3.1.3): align shared types for subjects and curriculum"
```

---

### Task 3: Service — subjects.ts

**Files:**
- Create: `apps/web/services/subjects.ts`
- Test: `apps/web/tests/services/subjects.test.ts`

**Interfaces:**
- Consumes: `ServiceContext { db: DatabaseClient; schoolId: string }`
- Produces: `listSubjects(ctx, gradeLevelId?)`, `getSubject(ctx, id)`, `createSubject(ctx, data)`, `updateSubject(ctx, id, data)`, `deleteSubject(ctx, id)`

- [ ] **Step 1: Create the service file**

```ts
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { subjects, classSubjects, subjectGradeLevels } from '@edunexus/database';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export const createSubjectSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export const updateSubjectSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export async function listSubjects(ctx: ServiceContext, gradeLevelId?: string) {
  const whereConditions: (SQL | undefined)[] = [eq(subjects.schoolId, ctx.schoolId)];

  if (gradeLevelId) {
    const mappedIds = await ctx.db
      .select({ subjectId: subjectGradeLevels.subjectId })
      .from(subjectGradeLevels)
      .where(and(
        eq(subjectGradeLevels.schoolId, ctx.schoolId),
        eq(subjectGradeLevels.gradeLevelId, gradeLevelId),
      ));
    const ids = mappedIds.map((r: any) => r.subjectId);
    if (ids.length > 0) {
      whereConditions.push(sql`${subjects.id} = ANY(ARRAY[${sql.join(ids.map((id: string) => sql`${id}::uuid`), sql`, `)}]::uuid[])`);
    } else {
      return [];
    }
  }

  const rows = await ctx.db.select()
    .from(subjects)
    .where(and(...whereConditions))
    .orderBy(subjects.code);
  return rows;
}

export async function getSubject(ctx: ServiceContext, id: string) {
  const [row] = await ctx.db.select()
    .from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.schoolId, ctx.schoolId)))
    .limit(1);
  if (!row) throw new NotFoundError('Subject');
  return row;
}

export async function createSubject(ctx: ServiceContext, data: z.infer<typeof createSubjectSchema>) {
  const [existing] = await ctx.db.select({ id: subjects.id }).from(subjects)
    .where(and(eq(subjects.schoolId, ctx.schoolId), eq(subjects.code, data.code)))
    .limit(1);
  if (existing) throw new ConflictError('A subject with this code already exists');
  const [created] = await ctx.db.insert(subjects).values({
    schoolId: ctx.schoolId,
    code: data.code,
    name: data.name,
    category: data.category ?? null,
    description: data.description ?? null,
  }).returning();
  return created;
}

export async function updateSubject(ctx: ServiceContext, id: string, data: z.infer<typeof updateSubjectSchema>) {
  const [existing] = await ctx.db.select().from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Subject');
  if (data.code && data.code !== existing.code) {
    const [duplicate] = await ctx.db.select({ id: subjects.id }).from(subjects)
      .where(and(eq(subjects.schoolId, ctx.schoolId), eq(subjects.code, data.code)))
      .limit(1);
    if (duplicate) throw new ConflictError('A subject with this code already exists');
  }
  const [updated] = await ctx.db.update(subjects).set({
    ...(data.code !== undefined && { code: data.code }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.category !== undefined && { category: data.category }),
    ...(data.description !== undefined && { description: data.description }),
    updatedAt: new Date(),
  }).where(and(eq(subjects.id, id), eq(subjects.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}

export async function deleteSubject(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select({ id: subjects.id }).from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Subject');

  const [csCount] = await ctx.db.select({ count: sql<number>`count(*)` }).from(classSubjects)
    .where(and(eq(classSubjects.subjectId, id), eq(classSubjects.schoolId, ctx.schoolId)));
  if (Number(csCount.count) > 0) {
    throw new ConflictError('Cannot delete subject that is assigned to classes. Remove class-subject assignments first.');
  }

  const [sglCount] = await ctx.db.select({ count: sql<number>`count(*)` }).from(subjectGradeLevels)
    .where(and(eq(subjectGradeLevels.subjectId, id), eq(subjectGradeLevels.schoolId, ctx.schoolId)));
  if (Number(sglCount.count) > 0) {
    throw new ConflictError('Cannot delete subject that is mapped to grade levels. Remove grade-level mappings first.');
  }

  const [deleted] = await ctx.db.delete(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.schoolId, ctx.schoolId)))
    .returning({ id: subjects.id });
  if (!deleted) throw new NotFoundError('Subject');
  return { deleted: true };
}
```

- [ ] **Step 2: Create service tests**

```ts
// tests/services/subjects.test.ts
import { vi, describe, it, expect } from 'vitest';
import { listSubjects, getSubject, createSubject, updateSubject, deleteSubject } from '@/services/subjects';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

vi.mock('@edunexus/database', () => ({}));

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
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
const mockSubject = {
  id: 'sub-1', schoolId, code: 'MATH', name: 'Mathematics',
  category: 'core', description: null,
  createdAt: new Date(), updatedAt: new Date(),
};

describe('SubjectService', () => {
  describe('listSubjects', () => {
    it('returns all subjects ordered by code', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockSubject, { ...mockSubject, id: 'sub-2', code: 'ENG', name: 'English' }]);
      const result = await listSubjects({ db: mockDb, schoolId });
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('MATH');
    });
  });

  describe('getSubject', () => {
    it('returns a single subject', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockSubject]);
      const result = await getSubject({ db: mockDb, schoolId }, 'sub-1');
      expect(result.id).toBe('sub-1');
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getSubject({ db: mockDb, schoolId }, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createSubject', () => {
    it('creates a subject', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      mockDb.returning.mockResolvedValue([mockSubject]);
      const result = await createSubject({ db: mockDb, schoolId }, { code: 'MATH', name: 'Mathematics' });
      expect(result.id).toBe('sub-1');
    });
    it('rejects duplicate code', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockSubject]);
      await expect(createSubject({ db: mockDb, schoolId }, { code: 'MATH', name: 'Mathematics' })).rejects.toThrow(ConflictError);
    });
  });

  describe('updateSubject', () => {
    it('updates a subject name', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockSubject]);
      mockDb.returning.mockResolvedValue([{ ...mockSubject, name: 'Advanced Mathematics' }]);
      const result = await updateSubject({ db: mockDb, schoolId }, 'sub-1', { name: 'Advanced Mathematics' });
      expect(result.name).toBe('Advanced Mathematics');
    });
  });

  describe('deleteSubject', () => {
    it('deletes a subject with no references', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockSubject]);
      mockDb.where.mockResolvedValueOnce([{ count: '0' }]); // classSubjects
      mockDb.where.mockResolvedValueOnce([{ count: '0' }]); // subjectGradeLevels
      mockDb.returning.mockResolvedValue([{ id: 'sub-1' }]);
      const result = await deleteSubject({ db: mockDb, schoolId }, 'sub-1');
      expect(result.deleted).toBe(true);
    });
    it('rejects if referenced by classSubjects', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockSubject]);
      mockDb.where.mockResolvedValueOnce([{ count: '3' }]); // has class-subject refs
      await expect(deleteSubject({ db: mockDb, schoolId }, 'sub-1')).rejects.toThrow(ConflictError);
    });
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/subjects.test.ts --reporter=verbose
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/subjects.ts apps/web/tests/services/subjects.test.ts
git commit -m "feat(3.1.3): add subjects service with tests"
```

---

### Task 4: Service — subject-grade-levels.ts

**Files:**
- Create: `apps/web/services/subject-grade-levels.ts`
- Test: `apps/web/tests/services/subject-grade-levels.test.ts`

**Interfaces:**
- Consumes: `ServiceContext`, `subjectGradeLevels` from DB
- Produces: `listGradeLevelSubjects(ctx, gradeLevelId)`, `setGradeLevelSubjects(ctx, gradeLevelId, subjectIds[], defaultCore?)`, `toggleCore(ctx, id)`

- [ ] **Step 1: Create the service file**

```ts
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { subjectGradeLevels, subjects } from '@edunexus/database';
import { NotFoundError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export const setGradeLevelSubjectsSchema = z.object({
  subjectIds: z.array(z.string().uuid()).min(1, 'At least one subject required'),
  defaultCore: z.boolean().optional().default(true),
});

export async function listGradeLevelSubjects(ctx: ServiceContext, gradeLevelId: string) {
  const rows = await ctx.db.select({
    id: subjectGradeLevels.id,
    schoolId: subjectGradeLevels.schoolId,
    subjectId: subjectGradeLevels.subjectId,
    gradeLevelId: subjectGradeLevels.gradeLevelId,
    isCore: subjectGradeLevels.isCore,
    sortOrder: subjectGradeLevels.sortOrder,
    subjectCode: subjects.code,
    subjectName: subjects.name,
  }).from(subjectGradeLevels)
    .innerJoin(subjects, eq(subjectGradeLevels.subjectId, subjects.id))
    .where(and(
      eq(subjectGradeLevels.schoolId, ctx.schoolId),
      eq(subjectGradeLevels.gradeLevelId, gradeLevelId),
    ))
    .orderBy(subjects.code);
  return rows;
}

export async function setGradeLevelSubjects(
  ctx: ServiceContext,
  gradeLevelId: string,
  subjectIds: string[],
  defaultCore = true,
) {
  await ctx.db.transaction(async (tx: any) => {
    await tx.delete(subjectGradeLevels)
      .where(and(
        eq(subjectGradeLevels.schoolId, ctx.schoolId),
        eq(subjectGradeLevels.gradeLevelId, gradeLevelId),
      ));
    if (subjectIds.length > 0) {
      await tx.insert(subjectGradeLevels).values(
        subjectIds.map((subjectId, i) => ({
          schoolId: ctx.schoolId,
          subjectId,
          gradeLevelId,
          isCore: defaultCore,
          sortOrder: i,
        })),
      );
    }
  });
  return listGradeLevelSubjects(ctx, gradeLevelId);
}

export async function toggleCore(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select().from(subjectGradeLevels)
    .where(and(eq(subjectGradeLevels.id, id), eq(subjectGradeLevels.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Subject-grade-level mapping');
  const [updated] = await ctx.db.update(subjectGradeLevels).set({
    isCore: !existing.isCore,
    updatedAt: new Date(),
  }).where(and(eq(subjectGradeLevels.id, id), eq(subjectGradeLevels.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}
```

- [ ] **Step 2: Create service tests**

```ts
// tests/services/subject-grade-levels.test.ts
import { vi, describe, it, expect } from 'vitest';
import { listGradeLevelSubjects, setGradeLevelSubjects, toggleCore } from '@/services/subject-grade-levels';
import { NotFoundError } from '@/lib/api/errors';

vi.mock('@edunexus/database', () => ({}));

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
}

const schoolId = 'school-1';

describe('SubjectGradeLevelService', () => {
  describe('listGradeLevelSubjects', () => {
    it('returns subjects mapped to a grade level with subject details', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([
        { id: 'sgl-1', subjectId: 'sub-1', gradeLevelId: 'gl-1', isCore: true, subjectCode: 'MATH', subjectName: 'Mathematics', schoolId },
      ]);
      const result = await listGradeLevelSubjects({ db: mockDb, schoolId }, 'gl-1');
      expect(result).toHaveLength(1);
      expect(result[0].subjectCode).toBe('MATH');
    });
  });

  describe('setGradeLevelSubjects', () => {
    it('replaces all mappings in a transaction', async () => {
      const mockDb = createMockDb();
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockDb));
      mockDb.orderBy.mockResolvedValue([
        { id: 'sgl-1', subjectId: 'sub-1', gradeLevelId: 'gl-1', isCore: true, subjectCode: 'MATH', subjectName: 'Mathematics', schoolId },
      ]);
      const result = await setGradeLevelSubjects({ db: mockDb, schoolId }, 'gl-1', ['sub-1', 'sub-2']);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('toggleCore', () => {
    it('flips the isCore flag', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([{ id: 'sgl-1', isCore: true, schoolId }]);
      mockDb.returning.mockResolvedValue([{ id: 'sgl-1', isCore: false }]);
      const result = await toggleCore({ db: mockDb, schoolId }, 'sgl-1');
      expect(result.isCore).toBe(false);
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(toggleCore({ db: mockDb, schoolId }, 'bad-id')).rejects.toThrow(NotFoundError);
    });
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/subject-grade-levels.test.ts --reporter=verbose
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/subject-grade-levels.ts apps/web/tests/services/subject-grade-levels.test.ts
git commit -m "feat(3.1.3): add subject-grade-levels service with tests"
```

---

### Task 5: Service — curricula.ts

**Files:**
- Create: `apps/web/services/curricula.ts`
- Test: `apps/web/tests/services/curricula.test.ts`

**Interfaces:**
- Consumes: `ServiceContext`
- Produces: `listCurricula(ctx)`, `getCurriculum(ctx, id)`, `createCurriculum(ctx, data)`, `updateCurriculum(ctx, id, data)`, `deleteCurriculum(ctx, id)`, `setCurriculumSubjects(ctx, curriculumId, subjectIds[])`

- [ ] **Step 1: Create the service file**

```ts
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { curricula, curriculumSubjects, subjects } from '@edunexus/database';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

interface ServiceContext {
  db: any;
  schoolId: string;
}

export const createCurriculumSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

export const updateCurriculumSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const setCurriculumSubjectsSchema = z.object({
  subjectIds: z.array(z.string().uuid()).min(1, 'At least one subject required'),
});

export async function listCurricula(ctx: ServiceContext) {
  const rows = await ctx.db.select({
    id: curricula.id,
    schoolId: curricula.schoolId,
    code: curricula.code,
    name: curricula.name,
    description: curricula.description,
    createdAt: curricula.createdAt,
    updatedAt: curricula.updatedAt,
    subjectCount: sql<number>`coalesce(count(${curriculumSubjects.id}), 0)`,
  }).from(curricula)
    .leftJoin(curriculumSubjects, eq(curricula.id, curriculumSubjects.curriculumId))
    .where(eq(curricula.schoolId, ctx.schoolId))
    .groupBy(curricula.id)
    .orderBy(curricula.code);
  return rows;
}

export async function getCurriculum(ctx: ServiceContext, id: string) {
  const [row] = await ctx.db.select({
    id: curricula.id,
    schoolId: curricula.schoolId,
    code: curricula.code,
    name: curricula.name,
    description: curricula.description,
    createdAt: curricula.createdAt,
    updatedAt: curricula.updatedAt,
  }).from(curricula)
    .where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .limit(1);
  if (!row) throw new NotFoundError('Curriculum');

  const curriculumSubjectsRows = await ctx.db.select({
    id: subjects.id,
    schoolId: subjects.schoolId,
    code: subjects.code,
    name: subjects.name,
    category: subjects.category,
    description: subjects.description,
    createdAt: subjects.createdAt,
    updatedAt: subjects.updatedAt,
  }).from(subjects)
    .innerJoin(curriculumSubjects, eq(subjects.id, curriculumSubjects.subjectId))
    .where(and(
      eq(curriculumSubjects.curriculumId, id),
      eq(curriculumSubjects.schoolId, ctx.schoolId),
    ))
    .orderBy(subjects.code);

  return { ...row, subjects: curriculumSubjectsRows };
}

export async function createCurriculum(ctx: ServiceContext, data: z.infer<typeof createCurriculumSchema>) {
  const [existing] = await ctx.db.select({ id: curricula.id }).from(curricula)
    .where(and(eq(curricula.schoolId, ctx.schoolId), eq(curricula.code, data.code)))
    .limit(1);
  if (existing) throw new ConflictError('A curriculum with this code already exists');
  const [created] = await ctx.db.insert(curricula).values({
    schoolId: ctx.schoolId,
    code: data.code,
    name: data.name,
    description: data.description ?? null,
  }).returning();
  return created;
}

export async function updateCurriculum(ctx: ServiceContext, id: string, data: z.infer<typeof updateCurriculumSchema>) {
  const [existing] = await ctx.db.select().from(curricula)
    .where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Curriculum');
  if (data.code && data.code !== existing.code) {
    const [duplicate] = await ctx.db.select({ id: curricula.id }).from(curricula)
      .where(and(eq(curricula.schoolId, ctx.schoolId), eq(curricula.code, data.code)))
      .limit(1);
    if (duplicate) throw new ConflictError('A curriculum with this code already exists');
  }
  const [updated] = await ctx.db.update(curricula).set({
    ...(data.code !== undefined && { code: data.code }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    updatedAt: new Date(),
  }).where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .returning();
  return updated;
}

export async function deleteCurriculum(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select({ id: curricula.id }).from(curricula)
    .where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Curriculum');
  const [subjectCount] = await ctx.db.select({ count: sql<number>`count(*)` }).from(curriculumSubjects)
    .where(and(eq(curriculumSubjects.curriculumId, id), eq(curriculumSubjects.schoolId, ctx.schoolId)));
  if (Number(subjectCount.count) > 0) {
    throw new ConflictError('Cannot delete curriculum with subjects assigned. Remove subjects first.');
  }
  const [deleted] = await ctx.db.delete(curricula)
    .where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .returning({ id: curricula.id });
  if (!deleted) throw new NotFoundError('Curriculum');
  return { deleted: true };
}

export async function setCurriculumSubjects(ctx: ServiceContext, curriculumId: string, subjectIds: string[]) {
  const [existing] = await ctx.db.select({ id: curricula.id }).from(curricula)
    .where(and(eq(curricula.id, curriculumId), eq(curricula.schoolId, ctx.schoolId)))
    .limit(1);
  if (!existing) throw new NotFoundError('Curriculum');

  await ctx.db.transaction(async (tx: any) => {
    await tx.delete(curriculumSubjects)
      .where(and(
        eq(curriculumSubjects.curriculumId, curriculumId),
        eq(curriculumSubjects.schoolId, ctx.schoolId),
      ));
    if (subjectIds.length > 0) {
      await tx.insert(curriculumSubjects).values(
        subjectIds.map((subjectId) => ({
          schoolId: ctx.schoolId,
          curriculumId,
          subjectId,
        })),
      );
    }
  });

  return getCurriculum(ctx, curriculumId);
}
```

- [ ] **Step 2: Create service tests**

```ts
// tests/services/curricula.test.ts
import { vi, describe, it, expect } from 'vitest';
import { listCurricula, getCurriculum, createCurriculum, updateCurriculum, deleteCurriculum, setCurriculumSubjects } from '@/services/curricula';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

vi.mock('@edunexus/database', () => ({}));

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
}

const schoolId = 'school-1';
const mockCurriculum = {
  id: 'cur-1', schoolId, code: 'SCI', name: 'General Science',
  description: null, createdAt: new Date(), updatedAt: new Date(),
};

describe('CurriculumService', () => {
  describe('listCurricula', () => {
    it('returns curricula with subject count', async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([{ ...mockCurriculum, subjectCount: 3 }]);
      const result = await listCurricula({ db: mockDb, schoolId });
      expect(result).toHaveLength(1);
      expect(result[0].subjectCount).toBe(3);
    });
  });

  describe('getCurriculum', () => {
    it('returns curriculum with subjects', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockCurriculum]);
      mockDb.orderBy.mockResolvedValue([{ id: 'sub-1', code: 'PHY', name: 'Physics' }]);
      const result = await getCurriculum({ db: mockDb, schoolId }, 'cur-1');
      expect(result.code).toBe('SCI');
      expect(result.subjects).toHaveLength(1);
    });
    it('throws 404 if not found', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      await expect(getCurriculum({ db: mockDb, schoolId }, 'bad')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createCurriculum', () => {
    it('creates a curriculum', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([]);
      mockDb.returning.mockResolvedValue([mockCurriculum]);
      const result = await createCurriculum({ db: mockDb, schoolId }, { code: 'SCI', name: 'General Science' });
      expect(result.id).toBe('cur-1');
    });
    it('rejects duplicate code', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValue([mockCurriculum]);
      await expect(createCurriculum({ db: mockDb, schoolId }, { code: 'SCI', name: 'General Science' })).rejects.toThrow(ConflictError);
    });
  });

  describe('updateCurriculum', () => {
    it('updates a curriculum name', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockCurriculum]);
      mockDb.returning.mockResolvedValue([{ ...mockCurriculum, name: 'Advanced Science' }]);
      const result = await updateCurriculum({ db: mockDb, schoolId }, 'cur-1', { name: 'Advanced Science' });
      expect(result.name).toBe('Advanced Science');
    });
  });

  describe('deleteCurriculum', () => {
    it('deletes a curriculum with no subjects', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockCurriculum]);
      mockDb.where.mockResolvedValueOnce([{ count: '0' }]);
      mockDb.returning.mockResolvedValue([{ id: 'cur-1' }]);
      const result = await deleteCurriculum({ db: mockDb, schoolId }, 'cur-1');
      expect(result.deleted).toBe(true);
    });
    it('rejects if subjects are assigned', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockCurriculum]);
      mockDb.where.mockResolvedValueOnce([{ count: '2' }]);
      await expect(deleteCurriculum({ db: mockDb, schoolId }, 'cur-1')).rejects.toThrow(ConflictError);
    });
  });

  describe('setCurriculumSubjects', () => {
    it('replaces subjects in a transaction', async () => {
      const mockDb = createMockDb();
      mockDb.limit.mockResolvedValueOnce([mockCurriculum]);
      mockDb.transaction.mockImplementation(async (cb: any) => cb(mockDb));
      mockDb.limit.mockResolvedValue([mockCurriculum]);
      mockDb.orderBy.mockResolvedValue([]);
      const result = await setCurriculumSubjects({ db: mockDb, schoolId }, 'cur-1', ['sub-1']);
      expect(result.code).toBe('SCI');
    });
  });
});
```

- [ ] **Step 3: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/curricula.test.ts --reporter=verbose
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/services/curricula.ts apps/web/tests/services/curricula.test.ts
git commit -m "feat(3.1.3): add curricula service with tests"
```

---

### Task 6: API routes — subjects

**Files:**
- Create: `apps/web/app/api/subjects/route.ts`
- Create: `apps/web/app/api/subjects/[id]/route.ts`

**Interfaces:**
- Consumes: service functions from Task 3
- Produces: REST endpoints for subject CRUD

- [ ] **Step 1: Create collection route**

```ts
// apps/web/app/api/subjects/route.ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listSubjects, createSubject, createSubjectSchema } from '@/services/subjects';
import { db } from '@/lib/db';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId') ?? undefined;
  const data = await listSubjects({ db, schoolId: tenant.schoolId }, gradeLevelId);
  return apiSuccess(data);
});

export const POST = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = createSubjectSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await createSubject({ db, schoolId: tenant.schoolId }, parsed.data);
  return apiSuccess(data);
});
```

- [ ] **Step 2: Create [id] route**

```ts
// apps/web/app/api/subjects/[id]/route.ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { getSubject, updateSubject, deleteSubject, updateSubjectSchema } from '@/services/subjects';
import { db } from '@/lib/db';

export const GET = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await getSubject({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});

export const PATCH = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = updateSubjectSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await updateSubject({ db, schoolId: tenant.schoolId }, params.id, parsed.data);
  return apiSuccess(data);
});

export const DELETE = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await deleteSubject({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});
```

- [ ] **Step 3: Create API route tests**

```ts
// tests/app/api/subjects/route.test.ts
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

const { GET: listGET, POST: createPOST } = await import('@/app/api/subjects/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/subjects/[id]/route');

describe('GET /api/subjects', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns list of subjects', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'sub-1', code: 'MATH', name: 'Mathematics', schoolId }]);
    const req = new NextRequest('http://localhost/api/subjects');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/subjects', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a subject', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/subjects', {
      method: 'POST',
      body: JSON.stringify({ code: 'MATH', name: 'Mathematics' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
  it('returns 400 for invalid data', async () => {
    const req = new NextRequest('http://localhost/api/subjects', {
      method: 'POST', body: JSON.stringify({ code: '' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/subjects/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a subject', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'sub-1', code: 'MATH', schoolId }]);
    db.returning.mockResolvedValue([{ id: 'sub-1', name: 'Advanced Math' }]);
    const req = new NextRequest('http://localhost/api/subjects/sub-1', {
      method: 'PATCH', body: JSON.stringify({ name: 'Advanced Math' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'sub-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('DELETE /api/subjects/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('deletes a subject', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'sub-1', schoolId }]);
    db.where.mockResolvedValueOnce([{ count: '0' }]); // classSubjects
    db.where.mockResolvedValueOnce([{ count: '0' }]); // subjectGradeLevels
    db.returning.mockResolvedValue([{ id: 'sub-1' }]);
    const req = new NextRequest('http://localhost/api/subjects/sub-1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'sub-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/subjects.test.ts tests/app/api/subjects/route.test.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/subjects/
git add apps/web/tests/app/api/subjects/
git commit -m "feat(3.1.3): add subjects API routes with tests"
```

---

### Task 7: API routes — subject-grade-levels

**Files:**
- Create: `apps/web/app/api/subject-grade-levels/route.ts`
- Create: `apps/web/app/api/subject-grade-levels/[id]/toggle-core/route.ts`

**Interfaces:**
- Consumes: service functions from Task 4
- Produces: REST endpoints for grade-level subject mapping

- [ ] **Step 1: Create collection route**

```ts
// apps/web/app/api/subject-grade-levels/route.ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listGradeLevelSubjects, setGradeLevelSubjects, setGradeLevelSubjectsSchema } from '@/services/subject-grade-levels';
import { db } from '@/lib/db';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId');
  if (!gradeLevelId) return apiError(400, 'gradeLevelId query parameter is required');
  const data = await listGradeLevelSubjects({ db, schoolId: tenant.schoolId }, gradeLevelId);
  return apiSuccess(data);
});

export const POST = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId');
  if (!gradeLevelId) return apiError(400, 'gradeLevelId query parameter is required');
  const body = await request.json();
  const parsed = setGradeLevelSubjectsSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await setGradeLevelSubjects(
    { db, schoolId: tenant.schoolId },
    gradeLevelId,
    parsed.data.subjectIds,
    parsed.data.defaultCore,
  );
  return apiSuccess(data);
});
```

- [ ] **Step 2: Create toggle-core route**

```ts
// apps/web/app/api/subject-grade-levels/[id]/toggle-core/route.ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { toggleCore } from '@/services/subject-grade-levels';
import { db } from '@/lib/db';

export const POST = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await toggleCore({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});
```

- [ ] **Step 3: Create API route tests**

```ts
// tests/app/api/subject-grade-levels/route.test.ts
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
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

const { GET, POST } = await import('@/app/api/subject-grade-levels/route');
const { POST: togglePOST } = await import('@/app/api/subject-grade-levels/[id]/toggle-core/route');

describe('GET /api/subject-grade-levels', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns 400 if gradeLevelId missing', async () => {
    const req = new NextRequest('http://localhost/api/subject-grade-levels');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
  it('returns mapped subjects for a grade level', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'sgl-1', subjectCode: 'MATH', subjectName: 'Mathematics', isCore: true, schoolId }]);
    const req = new NextRequest('http://localhost/api/subject-grade-levels?gradeLevelId=gl-1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/subject-grade-levels', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('bulk sets grade-level subjects', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.transaction.mockImplementation(async (cb: any) => cb(db));
    db.orderBy.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/subject-grade-levels?gradeLevelId=gl-1', {
      method: 'POST',
      body: JSON.stringify({ subjectIds: ['sub-1', 'sub-2'] }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('POST /api/subject-grade-levels/[id]/toggle-core', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('toggles the isCore flag', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'sgl-1', isCore: true, schoolId }]);
    db.returning.mockResolvedValue([{ id: 'sgl-1', isCore: false }]);
    const req = new NextRequest('http://localhost/api/subject-grade-levels/sgl-1/toggle-core', { method: 'POST' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await togglePOST(req, { params: Promise.resolve({ id: 'sgl-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isCore).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/subject-grade-levels.test.ts tests/app/api/subject-grade-levels/route.test.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/subject-grade-levels/
git add apps/web/tests/app/api/subject-grade-levels/
git commit -m "feat(3.1.3): add subject-grade-levels API routes with tests"
```

---

### Task 8: API routes — curricula

**Files:**
- Create: `apps/web/app/api/curricula/route.ts`
- Create: `apps/web/app/api/curricula/[id]/route.ts`
- Create: `apps/web/app/api/curricula/[id]/subjects/route.ts`

**Interfaces:**
- Consumes: service functions from Task 5
- Produces: REST endpoints for curriculum CRUD and subject assignment

- [ ] **Step 1: Create collection route**

```ts
// apps/web/app/api/curricula/route.ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listCurricula, createCurriculum, createCurriculumSchema } from '@/services/curricula';
import { db } from '@/lib/db';

export const GET = routeHandler(async () => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = 'localhost'; // tenant resolved in handler
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await listCurricula({ db, schoolId: tenant.schoolId });
  return apiSuccess(data);
});

export const POST = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = createCurriculumSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await createCurriculum({ db, schoolId: tenant.schoolId }, parsed.data);
  return apiSuccess(data);
});
```

- [ ] **Step 2: Create [id] route**

```ts
// apps/web/app/api/curricula/[id]/route.ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { getCurriculum, updateCurriculum, deleteCurriculum, updateCurriculumSchema } from '@/services/curricula';
import { db } from '@/lib/db';

export const GET = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await getCurriculum({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});

export const PATCH = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = updateCurriculumSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await updateCurriculum({ db, schoolId: tenant.schoolId }, params.id, parsed.data);
  return apiSuccess(data);
});

export const DELETE = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await deleteCurriculum({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});
```

- [ ] **Step 3: Create subjects sub-route**

```ts
// apps/web/app/api/curricula/[id]/subjects/route.ts
import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { setCurriculumSubjects, setCurriculumSubjectsSchema } from '@/services/curricula';
import { db } from '@/lib/db';

export const POST = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = setCurriculumSubjectsSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await setCurriculumSubjects({ db, schoolId: tenant.schoolId }, params.id, parsed.data.subjectIds);
  return apiSuccess(data);
});
```

- [ ] **Step 4: Create API route tests**

```ts
// tests/app/api/curricula/route.test.ts
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
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/curricula/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/curricula/[id]/route');
const { POST: subjectsPOST } = await import('@/app/api/curricula/[id]/subjects/route');

describe('GET /api/curricula', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns list of curricula', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.orderBy.mockResolvedValue([{ id: 'cur-1', code: 'SCI', name: 'General Science', subjectCount: 3, schoolId }]);
    const res = await listGET(new NextRequest('http://localhost/api/curricula'));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/curricula', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/curricula', {
      method: 'POST',
      body: JSON.stringify({ code: 'SCI', name: 'General Science' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('PATCH /api/curricula/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'cur-1', code: 'SCI', schoolId }]);
    db.returning.mockResolvedValue([{ id: 'cur-1', name: 'Science Updated' }]);
    const req = new NextRequest('http://localhost/api/curricula/cur-1', {
      method: 'PATCH', body: JSON.stringify({ name: 'Science Updated' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await PATCH(req, { params: Promise.resolve({ id: 'cur-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('DELETE /api/curricula/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('deletes a curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'cur-1', schoolId }]);
    db.where.mockResolvedValueOnce([{ count: '0' }]);
    db.returning.mockResolvedValue([{ id: 'cur-1' }]);
    const req = new NextRequest('http://localhost/api/curricula/cur-1', { method: 'DELETE' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'cur-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe('POST /api/curricula/[id]/subjects', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('bulk assigns subjects to curriculum', async () => {
    const db: any = (await import('@/lib/db')).db;
    db.limit.mockResolvedValueOnce([{ id: 'cur-1', schoolId }]);
    db.transaction.mockImplementation(async (cb: any) => cb(db));
    db.limit.mockResolvedValue([{ id: 'cur-1', code: 'SCI', name: 'General Science', schoolId }]);
    db.orderBy.mockResolvedValue([]);
    const req = new NextRequest('http://localhost/api/curricula/cur-1/subjects', {
      method: 'POST',
      body: JSON.stringify({ subjectIds: ['sub-1', 'sub-2'] }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await subjectsPOST(req, { params: Promise.resolve({ id: 'cur-1' }) });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests, verify pass**

```bash
cd apps/web && npx vitest run tests/services/curricula.test.ts tests/app/api/curricula/route.test.ts --reporter=verbose
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/curricula/
git add apps/web/tests/app/api/curricula/
git commit -m "feat(3.1.3): add curricula API routes with tests"
```

---

### Task 9: UI — Subjects section

**Files:**
- Create: `apps/web/components/admin/academics/subjects-section.tsx`
- Create: `apps/web/components/admin/academics/create-subject-dialog.tsx`
- Create: `apps/web/components/admin/academics/edit-subject-dialog.tsx`
- Modify: `apps/web/components/admin/academics/academics-client.tsx`

- [ ] **Step 1: Create subjects-section.tsx**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { CreateSubjectDialog } from './create-subject-dialog';
import { EditSubjectDialog } from './edit-subject-dialog';
import { EmptyState } from '@/components/empty-state';

interface SubjectRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  schoolId: string;
}

export function SubjectsSection() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/subjects');
      const body = await res.json();
      if (body.success) setSubjects(body.data);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/subjects/${deleting.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        toast.success('Subject deleted');
        setDeleting(null);
        loadSubjects();
      } else {
        toast.error(body.error ?? 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Subjects</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          heading="No subjects yet"
          description="Create subjects to build your school's curriculum."
          action={{ label: 'Add Subject', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Badge variant="info" className="mt-0.5 shrink-0 font-mono text-xs">{subject.code}</Badge>
                  <div>
                    <p className="font-medium text-text-primary">{subject.name}</p>
                    {subject.description && (
                      <p className="mt-1 text-sm text-text-muted line-clamp-2">{subject.description}</p>
                    )}
                    {subject.category && (
                      <p className="mt-1 text-xs text-text-muted capitalize">{subject.category}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(subject)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting({ id: subject.id, name: subject.name })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateSubjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={() => { setShowCreate(false); loadSubjects(); }}
      />

      {editing && (
        <EditSubjectDialog
          subject={editing}
          open={!!editing}
          onOpenChange={() => setEditing(null)}
          onSuccess={() => { setEditing(null); loadSubjects(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Subject"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone if the subject is not referenced by any class or grade-level mapping.`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create create-subject-dialog.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'language', label: 'Language' },
  { value: 'religious', label: 'Religious & Moral' },
  { value: 'creative', label: 'Creative Arts' },
  { value: 'science', label: 'Science' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'humanities', label: 'Humanities' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSubjectDialog({ open, onOpenChange, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', category: '', description: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...data,
          category: data.category || undefined,
          description: data.description || undefined,
        }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Subject created');
        reset();
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to create subject');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add Subject</Dialog.Title>
          <Dialog.Description>Create a new subject for your school.</Dialog.Description>
        </Dialog.Header>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <div>
                <Input {...field} placeholder="e.g. MATH" label="Code" error={errors.code?.message} />
              </div>
            )}
          />
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="e.g. Mathematics" label="Name" error={errors.name?.message} />
            )}
          />
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                value={field.value ?? ''}
                items={CATEGORIES}
                label="Category"
                placeholder="Select category"
              >
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </Select>
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea {...field} value={field.value ?? ''} label="Description" placeholder="Optional description" />
            )}
          />
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Subject</Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create edit-subject-dialog.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'language', label: 'Language' },
  { value: 'religious', label: 'Religious & Moral' },
  { value: 'creative', label: 'Creative Arts' },
  { value: 'science', label: 'Science' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'humanities', label: 'Humanities' },
];

interface SubjectRow {
  id: string; code: string; name: string; category: string | null; description: string | null; schoolId: string;
}

interface Props {
  subject: SubjectRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSubjectDialog({ subject, open, onOpenChange, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: subject.code, name: subject.name, category: subject.category ?? '', description: subject.description ?? '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...data,
          category: data.category || null,
          description: data.description || null,
        }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Subject updated');
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to update subject');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Edit Subject</Dialog.Title>
          <Dialog.Description>Update subject details.</Dialog.Description>
        </Dialog.Header>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <Input {...field} label="Code" error={errors.code?.message} />
            )}
          />
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} label="Name" error={errors.name?.message} />
            )}
          />
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select {...field} value={field.value ?? ''} items={CATEGORIES} label="Category" placeholder="Select category">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </Select>
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea {...field} value={field.value ?? ''} label="Description" />
            )}
          />
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Changes</Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
```

- [ ] **Step 4: Wire into academics-client.tsx**

Add after the grade levels section:

```tsx
// After <GradeLevelsSection /> closing tag, add:
<div className="pt-6 border-t border-border">
  <SubjectsSection />
</div>
```

And add the import:

```tsx
import { SubjectsSection } from './subjects-section';
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/academics/subjects-section.tsx
git add apps/web/components/admin/academics/create-subject-dialog.tsx
git add apps/web/components/admin/academics/edit-subject-dialog.tsx
git add apps/web/components/admin/academics/academics-client.tsx
git commit -m "feat(3.1.3): add subjects UI components"
```

---

### Task 10: UI — Curricula section

**Files:**
- Create: `apps/web/components/admin/academics/curricula-section.tsx`
- Create: `apps/web/components/admin/academics/create-curriculum-dialog.tsx`
- Create: `apps/web/components/admin/academics/edit-curriculum-dialog.tsx`

- [ ] **Step 1: Create curricula-section.tsx**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Layers, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { CreateCurriculumDialog } from './create-curriculum-dialog';
import { EditCurriculumDialog } from './edit-curriculum-dialog';
import { EmptyState } from '@/components/empty-state';

interface CurriculumRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  subjectCount: number;
  schoolId: string;
}

export function CurriculaSection() {
  const [curricula, setCurricula] = useState<CurriculumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CurriculumRow | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  const loadCurricula = useCallback(async () => {
    try {
      const res = await fetch('/api/curricula');
      const body = await res.json();
      if (body.success) setCurricula(body.data);
    } catch {
      toast.error('Failed to load curricula');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCurricula(); }, [loadCurricula]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/curricula/${deleting.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (body.success) {
        toast.success('Curriculum deleted');
        setDeleting(null);
        loadCurricula();
      } else {
        toast.error(body.error ?? 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Curricula</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Curriculum
        </Button>
      </div>

      {curricula.length === 0 ? (
        <EmptyState
          icon={Layers}
          heading="No curricula yet"
          description="Group subjects into curricula like 'General Science' or 'Business'."
          action={{ label: 'Add Curriculum', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {curricula.map((curriculum) => (
            <Card key={curriculum.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="info" className="font-mono text-xs">{curriculum.code}</Badge>
                  <div>
                    <p className="font-medium text-text-primary">{curriculum.name}</p>
                    <p className="text-sm text-text-muted">
                      {curriculum.subjectCount} subject{curriculum.subjectCount !== 1 ? 's' : ''}
                      {curriculum.description && ` \u00b7 ${curriculum.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(curriculum)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting({ id: curriculum.id, name: curriculum.name })}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateCurriculumDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={() => { setShowCreate(false); loadCurricula(); }}
      />

      {editing && (
        <EditCurriculumDialog
          curriculum={editing}
          open={!!editing}
          onOpenChange={() => setEditing(null)}
          onSuccess={() => { setEditing(null); loadCurricula(); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Curriculum"
        description={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone if subjects are not assigned.`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create create-curriculum-dialog.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCurriculumDialog({ open, onOpenChange, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', description: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/curricula', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, description: data.description || undefined }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Curriculum created');
        reset();
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to create curriculum');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add Curriculum</Dialog.Title>
          <Dialog.Description>Create a curriculum grouping for subjects.</Dialog.Description>
        </Dialog.Header>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="e.g. SCI" label="Code" error={errors.code?.message} />
            )}
          />
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="e.g. General Science" label="Name" error={errors.name?.message} />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea {...field} value={field.value ?? ''} label="Description" placeholder="Optional description" />
            )}
          />
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Curriculum</Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create edit-curriculum-dialog.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface CurriculumRow {
  id: string; code: string; name: string; description: string | null; subjectCount: number; schoolId: string;
}

interface Props {
  curriculum: CurriculumRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCurriculumDialog({ curriculum, open, onOpenChange, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: curriculum.code, name: curriculum.name, description: curriculum.description ?? '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/curricula/${curriculum.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, description: data.description || null }),
      });
      const body = await res.json();
      if (body.success) {
        toast.success('Curriculum updated');
        onSuccess();
      } else {
        toast.error(body.error ?? 'Failed to update curriculum');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Edit Curriculum</Dialog.Title>
          <Dialog.Description>Update curriculum details.</Dialog.Description>
        </Dialog.Header>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <Input {...field} label="Code" error={errors.code?.message} />
            )}
          />
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} label="Name" error={errors.name?.message} />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea {...field} value={field.value ?? ''} label="Description" />
            )}
          />
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Changes</Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog>
  );
}
```

- [ ] **Step 4: Wire curricula section into academics-client.tsx**

Add after the subjects section:

```tsx
<div className="pt-6 border-t border-border">
  <CurriculaSection />
</div>
```

And add the import:

```tsx
import { CurriculaSection } from './curricula-section';
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/admin/academics/curricula-section.tsx
git add apps/web/components/admin/academics/create-curriculum-dialog.tsx
git add apps/web/components/admin/academics/edit-curriculum-dialog.tsx
git add apps/web/components/admin/academics/academics-client.tsx
git commit -m "feat(3.1.3): add curricula UI components"
```

---

### Task 11: Seed — add subjects, grade-level mappings, and curricula for demo school

**Files:**
- Modify: `packages/database/src/seed.ts`

- [ ] **Step 1: Add subjects to the seed script**

After the grade levels and classes are created, add subjects for the demo school:

```ts
import { subjects, subjectGradeLevels, curricula, curriculumSubjects } from './schema/index';

// After classes are created:

const subjectData = [
  { code: 'MATH', name: 'Mathematics', category: 'core' },
  { code: 'ENGLISH', name: 'English Language', category: 'core' },
  { code: 'SCIENCE', name: 'Science', category: 'core' },
  { code: 'GH_LANG', name: 'Ghanaian Language', category: 'language' },
  { code: 'BDT', name: 'Basic Design & Technology', category: 'vocational' },
  { code: 'ICT', name: 'Information Technology', category: 'core' },
  { code: 'CREATIVE', name: 'Creative Arts', category: 'creative' },
  { code: 'RME', name: 'Religious & Moral Education', category: 'religious' },
  { code: 'HISTORY', name: 'History', category: 'humanities' },
  { code: 'FRENCH', name: 'French', category: 'language' },
  { code: 'PE', name: 'Physical Education', category: 'core' },
];

const createdSubjects = await db.insert(subjects).values(
  subjectData.map((s) => ({ schoolId: school.id, ...s })),
).returning();
```

- [ ] **Step 2: Add grade-level mappings**

Map core subjects to all grade levels, some electives to specific levels:

```ts
// Map core subjects to all grade levels
const gradeLevelRows = await db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, school.id));
const coreSubjectCodes = ['MATH', 'ENGLISH', 'SCIENCE', 'ICT', 'PE'];
const coreSubjects = createdSubjects.filter((s: any) => coreSubjectCodes.includes(s.code));
const electiveSubjects = createdSubjects.filter((s: any) => !coreSubjectCodes.includes(s.code));

for (const gl of gradeLevelRows) {
  await db.insert(subjectGradeLevels).values(
    coreSubjects.map((s: any, i: number) => ({
      schoolId: school.id,
      subjectId: s.id,
      gradeLevelId: gl.id,
      isCore: true,
      sortOrder: i,
    })),
  );
  // Add some electives to higher grade levels
  if (gl.level >= 5) {
    await db.insert(subjectGradeLevels).values(
      electiveSubjects.slice(0, 4).map((s: any, i: number) => ({
        schoolId: school.id,
        subjectId: s.id,
        gradeLevelId: gl.id,
        isCore: false,
        sortOrder: coreSubjects.length + i,
      })),
    );
  }
}
```

- [ ] **Step 3: Add a curriculum**

```ts
const [coreCurriculum] = await db.insert(curricula).values({
  schoolId: school.id,
  code: 'CORE',
  name: 'Core Subjects',
  description: 'Ghana Education Service core curriculum subjects',
}).returning();

await db.insert(curriculumSubjects).values(
  coreSubjects.map((s: any) => ({
    schoolId: school.id,
    curriculumId: coreCurriculum.id,
    subjectId: s.id,
  })),
);
```

- [ ] **Step 4: Commit**

```bash
git add packages/database/src/seed.ts
git commit -m "feat(3.1.3): seed subjects, grade-level mappings, and curricula for demo school"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run all tests**

```bash
cd apps/web && npx vitest run tests/services/subjects.test.ts tests/services/subject-grade-levels.test.ts tests/services/curricula.test.ts tests/app/api/subjects/route.test.ts tests/app/api/subject-grade-levels/route.test.ts tests/app/api/curricula/route.test.ts --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run lint**

```bash
cd apps/web && npx next lint
```

Expected: No lint errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(3.1.3): subjects and curriculum CRUD complete"
```

- [ ] **Step 5: Verify seed**

```bash
cd packages/database && pnpm db:seed
pnpm dev
```

Expected: Demo school has subjects, grade-level mappings, and curricula visible in the Academics page.
