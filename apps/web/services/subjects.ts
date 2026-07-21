import { z } from 'zod';
import { eq, and, sql, type SQL } from 'drizzle-orm';
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
