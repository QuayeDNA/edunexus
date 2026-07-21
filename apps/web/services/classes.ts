import { classes, gradeLevels, academicYears, staff } from '@edunexus/database';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { DatabaseClient } from '@edunexus/database';
import { NotFoundError, ConflictError } from '@/lib/api/errors';

interface ServiceContext {
  db: DatabaseClient;
  schoolId: string;
}

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
  await ctx.db.update(classes).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(classes.id, id), eq(classes.schoolId, ctx.schoolId)))
    .returning({ id: classes.id });
  return { deleted: true };
}
