import { gradeLevels, classes } from '@edunexus/database';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { DatabaseClient } from '@edunexus/database';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

interface ServiceContext {
  db: DatabaseClient;
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
    sortOrder: data.sortOrder ?? 0,
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
    .where(and(eq(classes.gradeLevelId, id), eq(classes.schoolId, ctx.schoolId), sql`${classes.deletedAt} is null`))
    .limit(1);
  if (Number(classCount.count) > 0) {
    throw new ConflictError('Cannot delete grade level with existing classes. Delete the classes first.');
  }
  await ctx.db.delete(gradeLevels)
    .where(and(eq(gradeLevels.id, id), eq(gradeLevels.schoolId, ctx.schoolId)));
  return { deleted: true };
}
