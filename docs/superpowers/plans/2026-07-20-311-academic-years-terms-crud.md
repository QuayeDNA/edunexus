# [3.1.1] Academic Years & Terms CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** School admins can manage academic years and terms via CRUD UI + API, including auto-generating terms when creating a year, setting current year/term, and toggling term locks.

**Architecture:** Schema migration adds `locked` column to `terms`. A service layer in `apps/web/services/academic-structure.ts` contains all business logic (validation, transactions, auto-generation). API routes delegate to the service. A single admin page at `/admin/academics` provides the UI.

**Tech Stack:** Drizzle ORM, Next.js 16 App Router (Server Components + Client Components), react-hook-form + zod, shadcn/ui Nova, TanStack Query, Vitest

---

## Global Constraints

- All tenant-scoped queries include `school_id` filter — never bypass
- API routes use `requireRole('admin')` guard + `resolveTenant(host)` for school context
- Responses use `apiSuccess` / `apiError` envelope
- Monetary values: N/A (not applicable for academic structure)
- All dates stored as ISO 8601 UTC, displayed in en-GH locale
- DateTime inputs use `<Input type="date">` for date-only fields
- Use `cn()` for conditional class names
- Delete actions must show confirmation dialog
- Empty states: icon + heading + description + CTA
- Loading states: skeleton loaders
- Follow existing patterns in `apps/web/app/api/students/route.ts` and `apps/web/app/api/classes/route.ts`

---
---

### Task 1: Schema — Add locked column to terms

**Files:**
- Modify: `packages/database/src/schema/schools.ts` (add `locked` to `terms` table)
- Modify: `packages/shared/src/types/school.ts` (align interfaces with actual DB columns)

**Interfaces:**
- Consumes: existing `terms` table definition
- Produces: schema with `locked` column; updated TypeScript types

- [ ] **Step 1: Add `locked` column to `terms` schema**

In `packages/database/src/schema/schools.ts`, add the `locked` column to the `terms` table after `isCurrent`:

```typescript
export const terms = pgTable('terms', {
  // ... existing columns ...
  isCurrent: boolean('is_current').default(false).notNull(),
  locked: boolean('locked').default(false).notNull(),
  // ... existing timestamps ...
});
```

- [ ] **Step 2: Update shared AcademicYear and Term types**

In `packages/shared/src/types/school.ts`, replace entire file content with:

```typescript
import type { CurriculumMode, CalendarMode, GradingSystem, Status } from './common';

export interface School {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logo_url?: string | null;
  address: string;
  phone: string;
  email: string;
  curriculum_mode: CurriculumMode;
  calendar_mode: CalendarMode;
  grading_system: GradingSystem;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Term {
  id: string;
  schoolId: string;
  academicYearId: string;
  termNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Note: Using camelCase to match Drizzle field names (the `columns` helper in Drizzle maps snake_case DB columns to camelCase in query results).

- [ ] **Step 3: Verify no stale references to old `status` field on AcademicYear/Term**

Run:
```bash
pnpm exec tsc --noEmit
```

Expected: No type errors related to `AcademicYear.status` or `Term.status`.

- [ ] **Step 4: Commit**

```bash
git add packages/database/src/schema/schools.ts packages/shared/src/types/school.ts
git commit -m "feat(3.1.1): add locked column to terms schema, align shared types"
```

---

### Task 2: Service Layer — Academic structure business logic

**Files:**
- Create: `apps/web/services/academic-structure.ts`
- Test: `apps/web/tests/services/academic-structure.test.ts`

**Interfaces:**
- Consumes: `academicYears`, `terms`, `schools` from `@edunexus/database`; `db` from `@/lib/db`
- Produces: service functions with typed inputs and outputs (see steps below)

- [ ] **Step 1: Write service file skeleton and first failing tests**

Create `apps/web/services/academic-structure.ts`:

```typescript
import { db } from '@/lib/db';
import { academicYears, terms, schools } from '@edunexus/database';
import { eq, and, or, sql } from 'drizzle-orm';
import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  isCurrent: z.boolean().optional().default(false),
  autoGenerateTerms: z.boolean().optional().default(false),
  activateTerm1: z.boolean().optional().default(false),
});

export const updateAcademicYearSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isCurrent: z.boolean().optional(),
});

export const createTermSchema = z.object({
  academicYearId: z.string().uuid('Valid academic year ID is required'),
  termNumber: z.string().min(1, 'Term number is required').max(10),
  name: z.string().min(1, 'Name is required').max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  isCurrent: z.boolean().optional().default(false),
});

export const updateTermSchema = z.object({
  termNumber: z.string().min(1).max(10).optional(),
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isCurrent: z.boolean().optional(),
});

const GHANA_TERM_DEFAULTS = [
  { termNumber: '1', name: 'First Term' },
  { termNumber: '2', name: 'Second Term' },
  { termNumber: '3', name: 'Third Term' },
];

interface ServiceContext {
  db: typeof db;
  schoolId: string;
}

function ensureSchoolScope(conditions: any[], schoolId: string, table: any) {
  return [...conditions, eq(table.schoolId, schoolId)];
}

// Round date to month boundaries for term auto-generation
function getTermDate(yearStart: Date, yearEnd: Date, termIndex: number): { start: Date; end: Date } {
  const yearStartMonth = yearStart.getUTCMonth();
  const yearEndMonth = yearEnd.getUTCMonth();
  const totalMonths = yearEndMonth - yearStartMonth + (yearEnd.getUTCFullYear() - yearStart.getUTCFullYear()) * 12;
  const monthsPerTerm = Math.round(totalMonths / 3);
  const termStart = new Date(yearStart);
  termStart.setUTCMonth(yearStartMonth + termIndex * monthsPerTerm);
  const termEnd = new Date(termStart);
  termEnd.setUTCMonth(termStart.getUTCMonth() + monthsPerTerm - 1);
  termEnd.setUTCDate(new Date(termEnd.getUTCFullYear(), termEnd.getUTCMonth() + 1, 0).getUTCDate());
  return { start: termStart, end: termEnd };
}

function validateDateOrder(startDate: string, endDate: string, label: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start >= end) {
    throw new AppError(400, `${label}: start date must be before end date`);
  }
}

function validateTermInYear(termStart: string, termEnd: string, yearStart: string, yearEnd: string): void {
  const ts = new Date(termStart);
  const te = new Date(termEnd);
  const ys = new Date(yearStart);
  const ye = new Date(yearEnd);
  if (ts < ys || te > ye) {
    throw new AppError(400, 'Term dates must fall within the academic year date range');
  }
}

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export async function createAcademicYear(ctx: ServiceContext, data: z.infer<typeof createAcademicYearSchema>) {
  validateDateOrder(data.startDate, data.endDate, 'Academic year');

  const [existing] = await ctx.db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, ctx.schoolId), eq(academicYears.name, data.name)))
    .limit(1);

  if (existing) {
    throw new AppError(409, 'An academic year with this name already exists');
  }

  const [year] = await ctx.db.insert(academicYears).values({
    schoolId: ctx.schoolId,
    name: data.name,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    isCurrent: data.isCurrent,
  }).returning();

  let createdTerms: any[] = [];

  if (data.autoGenerateTerms) {
    const yearStart = new Date(data.startDate);
    const yearEnd = new Date(data.endDate);

    createdTerms = await Promise.all(
      GHANA_TERM_DEFAULTS.map(async (tdef, i) => {
        const { start, end } = getTermDate(yearStart, yearEnd, i);
        const [term] = await ctx.db.insert(terms).values({
          schoolId: ctx.schoolId,
          academicYearId: year.id,
          termNumber: tdef.termNumber,
          name: tdef.name,
          startDate: start,
          endDate: end,
          isCurrent: data.activateTerm1 && i === 0,
          locked: false,
        }).returning();
        return term;
      })
    );
  }

  if (data.activateTerm1 && data.isCurrent) {
    await ctx.db.update(academicYears).set({ isCurrent: false })
      .where(and(eq(academicYears.schoolId, ctx.schoolId), eq(academicYears.isCurrent, true)));
    await ctx.db.update(academicYears).set({ isCurrent: true })
      .where(eq(academicYears.id, year.id));
    year.isCurrent = true;
  }

  return { ...year, terms: createdTerms };
}

export async function updateAcademicYear(ctx: ServiceContext, id: string, data: z.infer<typeof updateAcademicYearSchema>) {
  if (data.startDate && data.endDate) {
    validateDateOrder(data.startDate, data.endDate, 'Academic year');
  }

  const [updated] = await ctx.db.update(academicYears)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
      updatedAt: new Date(),
    })
    .where(and(eq(academicYears.id, id), eq(academicYears.schoolId, ctx.schoolId)))
    .returning();

  if (!updated) throw new AppError(404, 'Academic year not found');
  return updated;
}

export async function deleteAcademicYear(ctx: ServiceContext, id: string) {
  const [termCount] = await ctx.db.select({ count: sql<number>`count(*)` })
    .from(terms)
    .where(and(eq(terms.academicYearId, id), eq(terms.schoolId, ctx.schoolId)));

  if (Number(termCount.count) > 0) {
    throw new AppError(409, 'Cannot delete academic year with existing terms. Delete the terms first.');
  }

  const [deleted] = await ctx.db.delete(academicYears)
    .where(and(eq(academicYears.id, id), eq(academicYears.schoolId, ctx.schoolId)))
    .returning({ id: academicYears.id });

  if (!deleted) throw new AppError(404, 'Academic year not found');
  return { deleted: true };
}

export async function setCurrentAcademicYear(ctx: ServiceContext, id: string) {
  const [target] = await ctx.db.select().from(academicYears)
    .where(and(eq(academicYears.id, id), eq(academicYears.schoolId, ctx.schoolId)))
    .limit(1);

  if (!target) throw new AppError(404, 'Academic year not found');

  await ctx.db.transaction(async (tx) => {
    await tx.update(academicYears).set({ isCurrent: false, updatedAt: new Date() })
      .where(and(eq(academicYears.schoolId, ctx.schoolId), eq(academicYears.isCurrent, true)));
    await tx.update(academicYears).set({ isCurrent: true, updatedAt: new Date() })
      .where(eq(academicYears.id, id));
  });

  return { ...target, isCurrent: true };
}

export async function listAcademicYears(ctx: ServiceContext, includeInactive = false) {
  const conditions = [eq(academicYears.schoolId, ctx.schoolId)];
  const rows = await ctx.db.select()
    .from(academicYears)
    .where(and(...conditions))
    .orderBy(sql`${academicYears.startDate} desc`);
  return rows;
}

export async function getAcademicYear(ctx: ServiceContext, id: string) {
  const [year] = await ctx.db.select().from(academicYears)
    .where(and(eq(academicYears.id, id), eq(academicYears.schoolId, ctx.schoolId)))
    .limit(1);

  if (!year) throw new AppError(404, 'Academic year not found');

  const termRows = await ctx.db.select().from(terms)
    .where(and(eq(terms.academicYearId, id), eq(terms.schoolId, ctx.schoolId)))
    .orderBy(sql`${terms.termNumber} asc`);

  return { ...year, terms: termRows };
}

export async function createTerm(ctx: ServiceContext, data: z.infer<typeof createTermSchema>) {
  const [year] = await ctx.db.select().from(academicYears)
    .where(and(eq(academicYears.id, data.academicYearId), eq(academicYears.schoolId, ctx.schoolId)))
    .limit(1);

  if (!year) throw new AppError(404, 'Academic year not found');

  validateDateOrder(data.startDate, data.endDate, 'Term');
  validateTermInYear(data.startDate, data.endDate, year.startDate.toISOString().split('T')[0], year.endDate.toISOString().split('T')[0]);

  const [existing] = await ctx.db.select({ id: terms.id }).from(terms)
    .where(and(
      eq(terms.academicYearId, data.academicYearId),
      eq(terms.schoolId, ctx.schoolId),
      eq(terms.termNumber, data.termNumber),
    ))
    .limit(1);

  if (existing) throw new AppError(409, `Term ${data.termNumber} already exists in this academic year`);

  const [overlap] = await ctx.db.select({ id: terms.id }).from(terms)
    .where(and(
      eq(terms.academicYearId, data.academicYearId),
      eq(terms.schoolId, ctx.schoolId),
      sql`${terms.startDate} < ${new Date(data.endDate)}`,
      sql`${terms.endDate} > ${new Date(data.startDate)}`,
    ))
    .limit(1);

  if (overlap) throw new AppError(409, 'Term dates overlap with an existing term in this academic year');

  const [term] = await ctx.db.insert(terms).values({
    schoolId: ctx.schoolId,
    academicYearId: data.academicYearId,
    termNumber: data.termNumber,
    name: data.name,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    isCurrent: data.isCurrent,
    locked: false,
  }).returning();

  return term;
}

export async function updateTerm(ctx: ServiceContext, id: string, data: z.infer<typeof updateTermSchema>) {
  const [existing] = await ctx.db.select().from(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .limit(1);

  if (!existing) throw new AppError(404, 'Term not found');

  if (data.startDate && data.endDate) {
    validateDateOrder(data.startDate, data.endDate, 'Term');
    if (existing.academicYearId) {
      const [year] = await ctx.db.select().from(academicYears)
        .where(eq(academicYears.id, existing.academicYearId))
        .limit(1);
      if (year) {
        validateTermInYear(data.startDate, data.endDate, year.startDate.toISOString().split('T')[0], year.endDate.toISOString().split('T')[0]);
      }
    }
  }

  const [updated] = await ctx.db.update(terms)
    .set({
      ...(data.termNumber !== undefined && { termNumber: data.termNumber }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
      updatedAt: new Date(),
    })
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .returning();

  return updated;
}

export async function deleteTerm(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select().from(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .limit(1);

  if (!existing) throw new AppError(404, 'Term not found');

  const [deleted] = await ctx.db.delete(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .returning({ id: terms.id });

  return { deleted: true };
}

export async function toggleTermLock(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select().from(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .limit(1);

  if (!existing) throw new AppError(404, 'Term not found');

  const [updated] = await ctx.db.update(terms)
    .set({ locked: !existing.locked, updatedAt: new Date() })
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .returning();

  return updated;
}

export async function setCurrentTerm(ctx: ServiceContext, id: string) {
  const [target] = await ctx.db.select().from(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .limit(1);

  if (!target) throw new AppError(404, 'Term not found');

  await ctx.db.transaction(async (tx) => {
    await tx.update(terms).set({ isCurrent: false, updatedAt: new Date() })
      .where(and(
        eq(terms.schoolId, ctx.schoolId),
        eq(terms.academicYearId, target.academicYearId),
        eq(terms.isCurrent, true),
      ));
    await tx.update(terms).set({ isCurrent: true, updatedAt: new Date() })
      .where(eq(terms.id, id));
  });

  return { ...target, isCurrent: true };
}

export async function listTerms(ctx: ServiceContext, academicYearId: string) {
  const conditions = [eq(terms.schoolId, ctx.schoolId), eq(terms.academicYearId, academicYearId)];
  const rows = await ctx.db.select()
    .from(terms)
    .where(and(...conditions))
    .orderBy(sql`${terms.termNumber} asc`);
  return rows;
}

export async function getTerm(ctx: ServiceContext, id: string) {
  const [term] = await ctx.db.select().from(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .limit(1);

  if (!term) throw new AppError(404, 'Term not found');
  return term;
}
```

- [ ] **Step 2: Write failing tests for the service**

Create `apps/web/tests/services/academic-structure.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  createAcademicYear, updateAcademicYear, deleteAcademicYear,
  setCurrentAcademicYear, listAcademicYears, getAcademicYear,
  createTerm, updateTerm, deleteTerm, toggleTermLock,
  setCurrentTerm, listTerms, getTerm, AppError,
  createAcademicYearSchema, createTermSchema,
} from '@/services/academic-structure';

const schoolId = 'school-1';

const mockYear = {
  id: 'year-1', schoolId, name: '2024/2025',
  startDate: new Date('2024-09-09'), endDate: new Date('2025-07-18'),
  isCurrent: true, createdAt: new Date(), updatedAt: new Date(),
};

const mockYears = [mockYear];

const mockTerm = {
  id: 'term-1', schoolId, academicYearId: 'year-1',
  termNumber: '1', name: 'First Term',
  startDate: new Date('2024-09-09'), endDate: new Date('2024-12-13'),
  isCurrent: true, locked: false, createdAt: new Date(), updatedAt: new Date(),
};

const mockTerms = [mockTerm];

function createMockDb() {
  const txRun = vi.fn();
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
    transaction: vi.fn().mockImplementation(async (cb: any) => {
      const tx = createMockDb();
      await cb(tx);
      return tx;
    }),
  };
}

describe('AcademicStructureService', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let ctx: { db: any; schoolId: string };

  beforeEach(() => {
    mockDb = createMockDb();
    ctx = { db: mockDb, schoolId };
    vi.clearAllMocks();
  });

  describe('createAcademicYear', () => {
    it('creates a year with valid data', async () => {
      mockDb.returning.mockResolvedValue([mockYear]);
      mockDb.limit.mockResolvedValue([]);

      const result = await createAcademicYear(ctx, {
        name: '2024/2025', startDate: '2024-09-09', endDate: '2025-07-18',
        isCurrent: false, autoGenerateTerms: false, activateTerm1: false,
      });

      expect(result.name).toBe('2024/2025');
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it('rejects start date after end date', async () => {
      mockDb.returning.mockResolvedValue([mockYear]);
      mockDb.limit.mockResolvedValue([]);

      await expect(createAcademicYear(ctx, {
        name: 'Bad', startDate: '2025-01-01', endDate: '2024-01-01',
        isCurrent: false, autoGenerateTerms: false, activateTerm1: false,
      })).rejects.toThrow(AppError);
    });

    it('rejects duplicate name', async () => {
      mockDb.limit.mockResolvedValue([{ id: 'existing' }]);

      await expect(createAcademicYear(ctx, {
        name: '2024/2025', startDate: '2024-09-09', endDate: '2025-07-18',
        isCurrent: false, autoGenerateTerms: false, activateTerm1: false,
      })).rejects.toThrow(AppError);
    });
  });

  describe('setCurrentAcademicYear', () => {
    it('unsets all years then sets target in a transaction', async () => {
      mockDb.limit.mockResolvedValue([mockYear]);
      mockDb.returning.mockResolvedValue([mockYear]);

      const result = await setCurrentAcademicYear(ctx, 'year-1');

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(result.isCurrent).toBe(true);
    });

    it('throws 404 if year not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(setCurrentAcademicYear(ctx, 'missing')).rejects.toThrow(AppError);
    });
  });

  describe('deleteAcademicYear', () => {
    it('rejects if year has terms', async () => {
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: '3' }]) }) });

      ctx.db.select = vi.fn().mockReturnThis();
      ctx.db.from = vi.fn().mockReturnThis();
      ctx.db.where = vi.fn().mockResolvedValue([{ count: '3' }]);

      await expect(deleteAcademicYear(ctx, 'year-1')).rejects.toThrow(AppError);
    });
  });

  describe('createTerm', () => {
    it('creates a term within valid year range', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit
        .mockResolvedValueOnce([mockYear])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockDb2.returning.mockResolvedValue([mockTerm]);

      const result = await createTerm({ db: mockDb2, schoolId }, {
        academicYearId: 'year-1', termNumber: '1', name: 'First Term',
        startDate: '2024-09-09', endDate: '2024-12-13',
      });

      expect(result.name).toBe('First Term');
      expect(result.locked).toBe(false);
    });

    it('rejects term dates outside year range', async () => {
      const mockDb2 = createMockDb();
      mockDb2.limit.mockResolvedValueOnce([mockYear]);

      await expect(createTerm({ db: mockDb2, schoolId }, {
        academicYearId: 'year-1', termNumber: '1', name: 'Bad',
        startDate: '2025-09-09', endDate: '2025-12-13',
      })).rejects.toThrow(AppError);
    });
  });

  describe('toggleTermLock', () => {
    it('toggles locked from false to true', async () => {
      const unlocked = { ...mockTerm, locked: false };
      const locked = { ...mockTerm, locked: true };
      mockDb.limit.mockResolvedValue([unlocked]);
      mockDb.returning.mockResolvedValue([locked]);

      const result = await toggleTermLock(ctx, 'term-1');

      expect(result.locked).toBe(true);
    });

    it('throws 404 if term not found', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(toggleTermLock(ctx, 'missing')).rejects.toThrow(AppError);
    });
  });

  describe('setCurrentTerm', () => {
    it('unsets all terms in year then sets target', async () => {
      mockDb.limit.mockResolvedValue([mockTerm]);

      const result = await setCurrentTerm(ctx, 'term-1');

      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(result.isCurrent).toBe(true);
    });
  });
});
```

- [ ] **Step 3: Run failing tests**

```bash
cd apps/web && npx vitest run tests/services/academic-structure.test.ts --reporter=verbose
```

Expected: Tests fail because service file doesn't exist yet, or modules not found.

- [ ] **Step 4: Get tests passing**

Fix any import issues, then re-run:
```bash
cd apps/web && npx vitest run tests/services/academic-structure.test.ts --reporter=verbose
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/services/academic-structure.ts apps/web/tests/services/academic-structure.test.ts
git commit -m "feat(3.1.1): add academic structure service layer with tests"
```

---

### Task 3: API Routes — Academic Years

**Files:**
- Create: `apps/web/app/api/academic-years/route.ts`
- Create: `apps/web/app/api/academic-years/[id]/route.ts`
- Create: `apps/web/app/api/academic-years/[id]/set-current/route.ts`
- Test: `apps/web/tests/app/api/academic-years/route.test.ts`

**Interfaces:**
- Consumes: service functions from Task 2
- Produces: Next.js route handlers following existing API patterns

- [ ] **Step 1: Create GET and POST for /api/academic-years**

Create `apps/web/app/api/academic-years/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import {
  listAcademicYears, createAcademicYear,
  createAcademicYearSchema, AppError,
} from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('includeInactive') === 'true';

  try {
    const years = await listAcademicYears({ db, schoolId: tenant.schoolId }, includeInactive);
    return apiSuccess(years);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
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
  const parsed = createAcademicYearSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const year = await createAcademicYear({ db, schoolId: tenant.schoolId }, parsed.data);
    return apiSuccess(year);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}
```

- [ ] **Step 2: Create GET, PATCH, DELETE for /api/academic-years/[id]**

Create `apps/web/app/api/academic-years/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import {
  getAcademicYear, updateAcademicYear, deleteAcademicYear,
  updateAcademicYearSchema, AppError,
} from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const year = await getAcademicYear({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(year);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;
  const body = await request.json();
  const parsed = updateAcademicYearSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const year = await updateAcademicYear({ db, schoolId: tenant.schoolId }, id, parsed.data);
    return apiSuccess(year);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const result = await deleteAcademicYear({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}
```

- [ ] **Step 3: Create POST /api/academic-years/[id]/set-current**

Create `apps/web/app/api/academic-years/[id]/set-current/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { setCurrentAcademicYear, AppError } from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const year = await setCurrentAcademicYear({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(year);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}
```

- [ ] **Step 4: Write API integration test**

Create `apps/web/tests/app/api/academic-years/route.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'u1', role: 'admin', schoolId, email: 'a@b.com', name: 'A' },
  }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId }),
}));
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
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockDb)),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/academic-years/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/academic-years/[id]/route');
const { POST: setCurrentPOST } = await import('@/app/api/academic-years/[id]/set-current/route');

describe('GET /api/academic-years', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns list of academic years', async () => {
    const { db } = await import('@/lib/db');
    db.orderBy.mockResolvedValue([
      { id: 'y1', name: '2024/2025', isCurrent: true, schoolId },
    ]);

    const req = new NextRequest('http://localhost/api/academic-years');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('POST /api/academic-years', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a year with valid data', async () => {
    const { db } = await import('@/lib/db');
    db.limit.mockResolvedValue([]);
    db.returning.mockResolvedValue([{ id: 'y1', name: '2025/2026', schoolId }]);

    const req = new NextRequest('http://localhost/api/academic-years', {
      method: 'POST',
      body: JSON.stringify({ name: '2025/2026', startDate: '2025-09-08', endDate: '2026-07-17' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.name).toBe('2025/2026');
  });

  it('returns 400 for invalid dates', async () => {
    const req = new NextRequest('http://localhost/api/academic-years', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bad', startDate: 'not-a-date', endDate: '2026-01-01' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/academic-years/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns year with terms', async () => {
    const { db } = await import('@/lib/db');
    db.limit.mockResolvedValueOnce([{ id: 'y1', name: '2024/2025', schoolId, startDate: new Date(), endDate: new Date() }]);
    db.orderBy.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost/api/academic-years/y1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await detailGET(req, { params: Promise.resolve({ id: 'y1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.id).toBe('y1');
  });
});

describe('POST /api/academic-years/[id]/set-current', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets the year as current', async () => {
    const { db } = await import('@/lib/db');
    db.limit.mockResolvedValue([{ id: 'y1', name: '2024/2025', schoolId, startDate: new Date(), endDate: new Date() }]);
    db.returning = vi.fn().mockResolvedValue([{ id: 'y1', isCurrent: true }]);

    const req = new NextRequest('http://localhost/api/academic-years/y1/set-current', { method: 'POST' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await setCurrentPOST(req, { params: Promise.resolve({ id: 'y1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.isCurrent).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd apps/web && npx vitest run tests/app/api/academic-years/route.test.ts --reporter=verbose
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/academic-years/ apps/web/tests/app/api/academic-years/
git commit -m "feat(3.1.1): add academic years API routes with tests"
```

---

### Task 4: API Routes — Terms

**Files:**
- Create: `apps/web/app/api/terms/route.ts`
- Create: `apps/web/app/api/terms/[id]/route.ts`
- Create: `apps/web/app/api/terms/[id]/set-current/route.ts`
- Create: `apps/web/app/api/terms/[id]/toggle-lock/route.ts`
- Test: `apps/web/tests/app/api/terms/route.test.ts`

**Interfaces:**
- Consumes: service functions from Task 2
- Produces: Next.js route handlers for terms CRUD

- [ ] **Step 1: Create GET and POST for /api/terms**

Create `apps/web/app/api/terms/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import {
  listTerms, createTerm, createTermSchema, AppError,
} from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  if (!academicYearId) return apiError(400, 'academicYearId query parameter is required');

  try {
    const rows = await listTerms({ db, schoolId: tenant.schoolId }, academicYearId);
    return apiSuccess(rows);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
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
  const parsed = createTermSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const term = await createTerm({ db, schoolId: tenant.schoolId }, parsed.data);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}
```

- [ ] **Step 2: Create GET, PATCH, DELETE for /api/terms/[id]**

Create `apps/web/app/api/terms/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import {
  getTerm, updateTerm, deleteTerm, updateTermSchema, AppError,
} from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const term = await getTerm({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;
  const body = await request.json();
  const parsed = updateTermSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const term = await updateTerm({ db, schoolId: tenant.schoolId }, id, parsed.data);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const result = await deleteTerm({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}
```

- [ ] **Step 3: Create POST /api/terms/[id]/set-current**

Create `apps/web/app/api/terms/[id]/set-current/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { setCurrentTerm, AppError } from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const term = await setCurrentTerm({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}
```

- [ ] **Step 4: Create POST /api/terms/[id]/toggle-lock**

Create `apps/web/app/api/terms/[id]/toggle-lock/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { toggleTermLock, AppError } from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const term = await toggleTermLock({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.status, error.message);
    throw error;
  }
}
```

- [ ] **Step 5: Write API integration test for terms**

Create `apps/web/tests/app/api/terms/route.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const schoolId = 'school-1';

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));
vi.mock('@/lib/auth/auth.config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'u1', role: 'admin', schoolId, email: 'a@b.com', name: 'A' },
  }),
}));
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({ schoolId }),
}));
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
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockDb)),
  };
  return { db: mockDb };
});

const { GET: listGET, POST: createPOST } = await import('@/app/api/terms/route');
const { GET: detailGET, PATCH, DELETE } = await import('@/app/api/terms/[id]/route');
const { POST: setCurrentPOST } = await import('@/app/api/terms/[id]/set-current/route');
const { POST: toggleLockPOST } = await import('@/app/api/terms/[id]/toggle-lock/route');

describe('GET /api/terms', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 if academicYearId missing', async () => {
    const req = new NextRequest('http://localhost/api/terms');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    expect(res.status).toBe(400);
  });

  it('returns terms for a valid academicYearId', async () => {
    const { db } = await import('@/lib/db');
    db.orderBy.mockResolvedValue([
      { id: 't1', termNumber: '1', name: 'First Term', locked: false, schoolId },
    ]);

    const req = new NextRequest('http://localhost/api/terms?academicYearId=y1');
    req.headers.set('host', 'demo.edunexus.com');
    const res = await listGET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/terms', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a term with valid data', async () => {
    const { db } = await import('@/lib/db');
    db.limit
      .mockResolvedValueOnce([{ id: 'y1', startDate: new Date('2024-09-09'), endDate: new Date('2025-07-18'), schoolId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    db.returning.mockResolvedValue([{ id: 't1', name: 'First Term', locked: false, schoolId }]);

    const req = new NextRequest('http://localhost/api/terms', {
      method: 'POST',
      body: JSON.stringify({ academicYearId: 'y1', termNumber: '1', name: 'First Term', startDate: '2024-09-09', endDate: '2024-12-13' }),
    });
    req.headers.set('host', 'demo.edunexus.com');
    req.headers.set('content-type', 'application/json');
    const res = await createPOST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.name).toBe('First Term');
  });
});

describe('POST /api/terms/[id]/toggle-lock', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('toggles term locked status', async () => {
    const { db } = await import('@/lib/db');
    db.limit.mockResolvedValue([{ id: 't1', locked: false, schoolId }]);
    db.returning.mockResolvedValue([{ id: 't1', locked: true, schoolId }]);

    const req = new NextRequest('http://localhost/api/terms/t1/toggle-lock', { method: 'POST' });
    req.headers.set('host', 'demo.edunexus.com');
    const res = await toggleLockPOST(req, { params: Promise.resolve({ id: 't1' }) });
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.locked).toBe(true);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd apps/web && npx vitest run tests/app/api/terms/route.test.ts --reporter=verbose
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/terms/ apps/web/tests/app/api/terms/
git commit -m "feat(3.1.1): add terms API routes with tests"
```

---

### Task 5: UI Page — Academic Management

**Files:**
- Create: `apps/web/app/(school)/admin/academics/page.tsx`
- Create: `apps/web/components/admin/academics/academics-client.tsx`
- Create: `apps/web/components/admin/academics/create-year-dialog.tsx`
- Create: `apps/web/components/admin/academics/edit-year-dialog.tsx`
- Create: `apps/web/components/admin/academics/create-term-dialog.tsx`
- Create: `apps/web/components/admin/academics/edit-term-dialog.tsx`
- Create: `apps/web/components/admin/academics/confirm-delete-dialog.tsx`

- [ ] **Step 1: Create server component wrapper page**

Create `apps/web/app/(school)/admin/academics/page.tsx`:

```typescript
import { requireRole } from '@/lib/auth/auth.guard';
import { db } from '@/lib/db';
import { AcademicManagementClient } from '@/components/admin/academics/academics-client';

export default async function AcademicsPage() {
  await requireRole('admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Academic Structure</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage academic years and terms
          </p>
        </div>
      </div>
      <AcademicManagementClient />
    </div>
  );
}
```

- [ ] **Step 2: Create the main client component**

Create `apps/web/components/admin/academics/academics-client.tsx`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Lock, Unlock, Star, Pencil, Trash2, Calendar } from 'lucide-react';
import { CreateYearDialog } from './create-year-dialog';
import { EditYearDialog } from './edit-year-dialog';
import { CreateTermDialog } from './create-term-dialog';
import { EditTermDialog } from './edit-term-dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms?: Term[];
}

interface Term {
  id: string;
  termNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  locked: boolean;
}

export function AcademicManagementClient() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);

  // Dialog states
  const [showCreateYear, setShowCreateYear] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [showCreateTerm, setShowCreateTerm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{ type: 'year' | 'term'; id: string; name: string } | null>(null);

  const loadYears = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years');
      const body = await res.json();
      if (body.success) setYears(body.data);
    } catch {
      toast.error('Failed to load academic years');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTerms = useCallback(async (yearId: string) => {
    setTermsLoading(true);
    try {
      const res = await fetch(`/api/terms?academicYearId=${yearId}`);
      const body = await res.json();
      if (body.success) setTerms(body.data);
    } catch {
      toast.error('Failed to load terms');
    } finally {
      setTermsLoading(false);
    }
  }, []);

  useEffect(() => { loadYears(); }, [loadYears]);

  useEffect(() => {
    if (selectedYearId) loadTerms(selectedYearId);
  }, [selectedYearId, loadTerms]);

  const handleSelectYear = (yearId: string) => {
    setSelectedYearId(prev => prev === yearId ? null : yearId);
  };

  const handleSetCurrentYear = async (id: string) => {
    const res = await fetch(`/api/academic-years/${id}/set-current`, { method: 'POST' });
    const body = await res.json();
    if (body.success) {
      toast.success('Current year updated');
      loadYears();
    } else {
      toast.error(body.error);
    }
  };

  const handleSetCurrentTerm = async (id: string) => {
    const res = await fetch(`/api/terms/${id}/set-current`, { method: 'POST' });
    const body = await res.json();
    if (body.success) {
      toast.success('Current term updated');
      if (selectedYearId) loadTerms(selectedYearId);
    } else {
      toast.error(body.error);
    }
  };

  const handleToggleLock = async (id: string) => {
    const res = await fetch(`/api/terms/${id}/toggle-lock`, { method: 'POST' });
    const body = await res.json();
    if (body.success) {
      toast.success(body.data.locked ? 'Term locked' : 'Term unlocked');
      if (selectedYearId) loadTerms(selectedYearId);
    } else {
      toast.error(body.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingTarget) return;
    const endpoint = deletingTarget.type === 'year'
      ? `/api/academic-years/${deletingTarget.id}`
      : `/api/terms/${deletingTarget.id}`;
    const res = await fetch(endpoint, { method: 'DELETE' });
    const body = await res.json();
    if (body.success) {
      toast.success(`${deletingTarget.type === 'year' ? 'Year' : 'Term'} deleted`);
      setDeletingTarget(null);
      loadYears();
      if (deletingTarget.type === 'term' && selectedYearId) loadTerms(selectedYearId);
      if (deletingTarget.type === 'year') setSelectedYearId(null);
    } else {
      toast.error(body.error);
    }
  };

  const currentYear = years.find(y => y.isCurrent);
  const currentTerm = selectedYearId ? terms.find(t => t.isCurrent) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentYear && (
        <Card className="border-brand-200 bg-brand-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-5 w-5 text-brand-600" />
            <p className="text-sm font-medium text-brand-800">
              Current Academic Year: <strong>{currentYear.name}</strong>
              {currentTerm && <> &mdash; Current Term: <strong>{currentTerm.name}</strong></>}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Academic Years</h2>
        <Button onClick={() => setShowCreateYear(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Academic Year
        </Button>
      </div>

      {years.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          heading="No academic years yet"
          description="Create your first academic year to start managing the school calendar."
          action={{ label: 'Add Academic Year', onClick: () => setShowCreateYear(true) }}
        />
      ) : (
        <div className="space-y-3">
          {years.map((year) => (
            <Card key={year.id} className="overflow-hidden">
              <div
                className="flex cursor-pointer items-center justify-between p-4 hover:bg-surface-hover"
                onClick={() => handleSelectYear(year.id)}
              >
                <div className="flex items-center gap-3">
                  {year.isCurrent && <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />}
                  <div>
                    <p className="font-medium text-text-primary">{year.name}</p>
                    <p className="text-sm text-text-muted">
                      {new Date(year.startDate).toLocaleDateString('en-GH')} &mdash; {new Date(year.endDate).toLocaleDateString('en-GH')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {year.isCurrent && <Badge variant="default">Current</Badge>}
                  {!year.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleSetCurrentYear(year.id); }}
                    >
                      Set Current
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setEditingYear(year); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeletingTarget({ type: 'year', id: year.id, name: year.name }); }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {selectedYearId === year.id && (
                <div className="border-t border-border bg-surface-muted px-4 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-primary">Terms</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowCreateTerm(true)}>
                      <Plus className="mr-1 h-3 w-3" /> Add Term
                    </Button>
                  </div>

                  {termsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : terms.length === 0 ? (
                    <p className="py-4 text-center text-sm text-text-muted">No terms yet for this academic year.</p>
                  ) : (
                    <div className="space-y-2">
                      {terms.map((term) => (
                        <div key={term.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                          <div className="flex items-center gap-3">
                            {term.isCurrent && <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />}
                            <div>
                              <p className="text-sm font-medium text-text-primary">
                                Term {term.termNumber}: {term.name}
                              </p>
                              <p className="text-xs text-text-muted">
                                {new Date(term.startDate).toLocaleDateString('en-GH')} &mdash; {new Date(term.endDate).toLocaleDateString('en-GH')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {term.isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                            <Badge variant={term.locked ? 'secondary' : 'outline'} className="text-xs">
                              {term.locked ? 'Locked' : 'Active'}
                            </Badge>
                            {!term.isCurrent && (
                              <Button variant="ghost" size="sm" onClick={() => handleSetCurrentTerm(term.id)}>
                                Set Current
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleToggleLock(term.id)}>
                              {term.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingTerm(term)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingTarget({ type: 'term', id: term.id, name: term.name })}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <CreateYearDialog
        open={showCreateYear}
        onOpenChange={setShowCreateYear}
        onSuccess={() => { setShowCreateYear(false); loadYears(); }}
      />

      {editingYear && (
        <EditYearDialog
          year={editingYear}
          open={!!editingYear}
          onOpenChange={() => setEditingYear(null)}
          onSuccess={() => { setEditingYear(null); loadYears(); }}
        />
      )}

      {showCreateTerm && selectedYearId && (
        <CreateTermDialog
          academicYearId={selectedYearId}
          open={showCreateTerm}
          onOpenChange={setShowCreateTerm}
          onSuccess={() => { setShowCreateTerm(false); loadTerms(selectedYearId); }}
        />
      )}

      {editingTerm && (
        <EditTermDialog
          term={editingTerm}
          open={!!editingTerm}
          onOpenChange={() => setEditingTerm(null)}
          onSuccess={() => { setEditingTerm(null); if (selectedYearId) loadTerms(selectedYearId); }}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deletingTarget}
        onOpenChange={() => setDeletingTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deletingTarget?.type === 'year' ? 'Academic Year' : 'Term'}`}
        description={`Are you sure you want to delete "${deletingTarget?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create the dialog components**

Create `apps/web/components/admin/academics/create-year-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CreateYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateYearDialog({ open, onOpenChange, onSuccess }: CreateYearDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoGenerateTerms, setAutoGenerateTerms] = useState(true);
  const [activateTerm1, setActivateTerm1] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDate, endDate, autoGenerateTerms, activateTerm1 }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Academic year created');
        setName('');
        setStartDate('');
        setEndDate('');
        setAutoGenerateTerms(true);
        setActivateTerm1(false);
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to create academic year');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Academic Year</DialogTitle>
          <DialogDescription>Create a new academic year for the school calendar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Year Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2025/2026" required />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Auto-generate terms</p>
              <p className="text-xs text-text-muted">Create 3 default terms for this academic year</p>
            </div>
            <Switch checked={autoGenerateTerms} onCheckedChange={setAutoGenerateTerms} />
          </div>
          {autoGenerateTerms && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Activate Term 1</p>
                <p className="text-xs text-text-muted">Set the first term as the current term</p>
              </div>
              <Switch checked={activateTerm1} onCheckedChange={setActivateTerm1} />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Academic Year'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create remaining dialog and delete-confirmation components**

Create `apps/web/components/admin/academics/edit-year-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface EditYearDialogProps {
  year: AcademicYear;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditYearDialog({ year, open, onOpenChange, onSuccess }: EditYearDialogProps) {
  const formatDate = (d: string) => new Date(d).toISOString().split('T')[0];
  const [name, setName] = useState(year.name);
  const [startDate, setStartDate] = useState(formatDate(year.startDate));
  const [endDate, setEndDate] = useState(formatDate(year.endDate));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(`/api/academic-years/${year.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDate, endDate }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Academic year updated');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to update');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Academic Year</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Year Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input id="edit-startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input id="edit-endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Create `apps/web/components/admin/academics/create-term-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateTermDialogProps {
  academicYearId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTermDialog({ academicYearId, open, onOpenChange, onSuccess }: CreateTermDialogProps) {
  const [termNumber, setTermNumber] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch('/api/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId, termNumber, name, startDate, endDate }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Term created');
        setTermNumber('');
        setName('');
        setStartDate('');
        setEndDate('');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to create term');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Term</DialogTitle>
          <DialogDescription>Add a term to the selected academic year.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termNumber">Term Number</Label>
              <Input id="termNumber" value={termNumber} onChange={(e) => setTermNumber(e.target.value)} placeholder="e.g. 1" required />
              {errors.termNumber && <p className="text-xs text-red-500">{errors.termNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="termName">Term Name</Label>
              <Input id="termName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. First Term" required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termStart">Start Date</Label>
              <Input id="termStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="termEnd">End Date</Label>
              <Input id="termEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Term'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Create `apps/web/components/admin/academics/edit-term-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Term {
  id: string;
  termNumber: string;
  name: string;
  startDate: string;
  endDate: string;
  locked: boolean;
}

interface EditTermDialogProps {
  term: Term;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTermDialog({ term, open, onOpenChange, onSuccess }: EditTermDialogProps) {
  const formatDate = (d: string) => new Date(d).toISOString().split('T')[0];
  const [termNumber, setTermNumber] = useState(term.termNumber);
  const [name, setName] = useState(term.name);
  const [startDate, setStartDate] = useState(formatDate(term.startDate));
  const [endDate, setEndDate] = useState(formatDate(term.endDate));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const res = await fetch(`/api/terms/${term.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termNumber, name, startDate, endDate }),
      });
      const body = await res.json();

      if (body.success) {
        toast.success('Term updated');
        onSuccess();
      } else if (body.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(body.errors)) {
          fieldErrors[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrors);
      } else {
        toast.error(body.error || 'Failed to update term');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Term</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-termNumber">Term Number</Label>
              <Input id="edit-termNumber" value={termNumber} onChange={(e) => setTermNumber(e.target.value)} required />
              {errors.termNumber && <p className="text-xs text-red-500">{errors.termNumber}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-termName">Term Name</Label>
              <Input id="edit-termName" value={name} onChange={(e) => setName(e.target.value)} required />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-termStart">Start Date</Label>
              <Input id="edit-termStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-termEnd">End Date</Label>
              <Input id="edit-termEnd" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Create `apps/web/components/admin/academics/confirm-delete-dialog.tsx`:

```typescript
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, title, description }: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 5: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No type errors. Fix any issues (likely import paths in components).

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(school\)/admin/academics/ apps/web/components/admin/academics/
git commit -m "feat(3.1.1): add academic years and terms management UI"
```

---

### Task 6: Seed Data — Add 2025/2026 academic year

**Files:**
- Modify: `packages/database/src/seed.ts`

- [ ] **Step 1: Add second academic year and terms to seed**

In `packages/database/src/seed.ts`, after the existing academic year block, add:

```typescript
console.log('Creating 2025/2026 academic year...');
const ACADEMIC_YEAR_2_NAME = '2025/2026';
const TERMS_2 = [
  { termNumber: '1', name: 'First Term', startDate: '2025-09-08', endDate: '2025-12-12' },
  { termNumber: '2', name: 'Second Term', startDate: '2026-01-05', endDate: '2026-04-10' },
  { termNumber: '3', name: 'Third Term', startDate: '2026-04-27', endDate: '2026-07-17' },
];

const existingYear2 = await db.select({ id: academicYears.id }).from(academicYears)
  .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.name, ACADEMIC_YEAR_2_NAME)))
  .then((r) => r[0] ?? null);

if (existingYear2) {
  console.log(`   Found existing: ${ACADEMIC_YEAR_2_NAME}`);
} else {
  const [year2] = await db.insert(academicYears).values({
    schoolId,
    name: ACADEMIC_YEAR_2_NAME,
    startDate: new Date('2025-09-08'),
    endDate: new Date('2026-07-17'),
    isCurrent: false,
  }).returning({ id: academicYears.id });
  console.log(`   Created: ${ACADEMIC_YEAR_2_NAME}`);

  for (const term of TERMS_2) {
    await db.insert(terms).values({
      schoolId,
      academicYearId: year2.id,
      termNumber: term.termNumber,
      name: term.name,
      startDate: new Date(term.startDate),
      endDate: new Date(term.endDate),
      isCurrent: false,
      locked: false,
    });
  }
  console.log(`   Terms for ${ACADEMIC_YEAR_2_NAME}: 3 created`);
}
```

This should be placed after the existing academic year creation (around line 116 in the existing file) but still reference `schoolId` from the earlier query.

- [ ] **Step 2: Commit**

```bash
git add packages/database/src/seed.ts
git commit -m "feat(3.1.1): add 2025/2026 demo academic year to seed data"
```

---

### Task 7: Final Verification

**Files:**
- Run: lint, typecheck, and test suites

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Run all tests**

```bash
cd apps/web && npx vitest run
```

Expected: All tests PASS (existing + new).

- [ ] **Step 4: Fix any issues found**

If issues found in steps 1-3, fix them, re-run, and only proceed once clean.

- [ ] **Step 5: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "chore(3.1.1): fix lint/typecheck/test issues"
```
