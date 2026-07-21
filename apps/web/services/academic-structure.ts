import { academicYears, terms } from '@edunexus/database';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { DatabaseClient } from '@edunexus/database';
import { AppError, ConflictError, NotFoundError } from '@/lib/api/errors';

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
  db: DatabaseClient;
  schoolId: string;
}

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
    throw new AppError(`${label}: start date must be before end date`, 400);
  }
}

function validateTermInYear(termStart: string, termEnd: string, yearStart: string, yearEnd: string): void {
  const ts = new Date(termStart);
  const te = new Date(termEnd);
  const ys = new Date(yearStart);
  const ye = new Date(yearEnd);
  if (ts < ys || te > ye) {
    throw new AppError('Term dates must fall within the academic year date range', 400);
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
    throw new ConflictError('An academic year with this name already exists');
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

  if (!updated) throw new NotFoundError('Academic year');
  return updated;
}

export async function deleteAcademicYear(ctx: ServiceContext, id: string) {
  const [termCount] = await ctx.db.select({ count: sql<number>`count(*)` })
    .from(terms)
    .where(and(eq(terms.academicYearId, id), eq(terms.schoolId, ctx.schoolId)));

  if (Number(termCount.count) > 0) {
    throw new ConflictError('Cannot delete academic year with existing terms. Delete the terms first.');
  }

  const [deleted] = await ctx.db.delete(academicYears)
    .where(and(eq(academicYears.id, id), eq(academicYears.schoolId, ctx.schoolId)))
    .returning({ id: academicYears.id });

  if (!deleted) throw new NotFoundError('Academic year');
  return { deleted: true };
}

export async function setCurrentAcademicYear(ctx: ServiceContext, id: string) {
  const [target] = await ctx.db.select().from(academicYears)
    .where(and(eq(academicYears.id, id), eq(academicYears.schoolId, ctx.schoolId)))
    .limit(1);

  if (!target) throw new NotFoundError('Academic year');

  await ctx.db.transaction(async (tx: any) => {
    await tx.update(academicYears).set({ isCurrent: false, updatedAt: new Date() })
      .where(and(eq(academicYears.schoolId, ctx.schoolId), eq(academicYears.isCurrent, true)));
    await tx.update(academicYears).set({ isCurrent: true, updatedAt: new Date() })
      .where(eq(academicYears.id, id));
  });

  return { ...target, isCurrent: true };
}

export async function listAcademicYears(ctx: ServiceContext, _includeInactive = false) {
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

  if (!year) throw new NotFoundError('Academic year');

  const termRows = await ctx.db.select().from(terms)
    .where(and(eq(terms.academicYearId, id), eq(terms.schoolId, ctx.schoolId)))
    .orderBy(sql`${terms.termNumber} asc`);

  return { ...year, terms: termRows };
}

export async function createTerm(ctx: ServiceContext, data: z.infer<typeof createTermSchema>) {
  const [year] = await ctx.db.select().from(academicYears)
    .where(and(eq(academicYears.id, data.academicYearId), eq(academicYears.schoolId, ctx.schoolId)))
    .limit(1);

  if (!year) throw new NotFoundError('Academic year');

  validateDateOrder(data.startDate, data.endDate, 'Term');
  validateTermInYear(data.startDate, data.endDate, year.startDate.toISOString().split('T')[0], year.endDate.toISOString().split('T')[0]);

  const [existing] = await ctx.db.select({ id: terms.id }).from(terms)
    .where(and(
      eq(terms.academicYearId, data.academicYearId),
      eq(terms.schoolId, ctx.schoolId),
      eq(terms.termNumber, data.termNumber),
    ))
    .limit(1);

  if (existing) throw new ConflictError(`Term ${data.termNumber} already exists in this academic year`);

  const [overlap] = await ctx.db.select({ id: terms.id }).from(terms)
    .where(and(
      eq(terms.academicYearId, data.academicYearId),
      eq(terms.schoolId, ctx.schoolId),
      sql`${terms.startDate} < ${new Date(data.endDate)}`,
      sql`${terms.endDate} > ${new Date(data.startDate)}`,
    ))
    .limit(1);

  if (overlap) throw new ConflictError('Term dates overlap with an existing term in this academic year');

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

  if (!existing) throw new NotFoundError('Term');

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

  if (!existing) throw new NotFoundError('Term');

  await ctx.db.delete(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .returning({ id: terms.id });

  return { deleted: true };
}

export async function toggleTermLock(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select().from(terms)
    .where(and(eq(terms.id, id), eq(terms.schoolId, ctx.schoolId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Term');

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

  if (!target) throw new NotFoundError('Term');

  await ctx.db.transaction(async (tx: any) => {
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

  if (!term) throw new NotFoundError('Term');
  return term;
}
