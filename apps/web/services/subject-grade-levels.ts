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
