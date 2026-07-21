import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { curricula, curriculumSubjects, subjects } from '@edunexus/database'
import { NotFoundError, ConflictError } from '@/lib/api/errors'

interface ServiceContext {
  db: any
  schoolId: string
}

export const createCurriculumSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})

export const updateCurriculumSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

export const setCurriculumSubjectsSchema = z.object({
  subjectIds: z.array(z.string().uuid()).min(1, 'At least one subject required'),
})

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
    .orderBy(curricula.code)
  return rows
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
    .limit(1)
  if (!row) throw new NotFoundError('Curriculum')

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
    .orderBy(subjects.code)

  return { ...row, subjects: curriculumSubjectsRows }
}

export async function createCurriculum(ctx: ServiceContext, data: z.infer<typeof createCurriculumSchema>) {
  const [existing] = await ctx.db.select({ id: curricula.id }).from(curricula)
    .where(and(eq(curricula.schoolId, ctx.schoolId), eq(curricula.code, data.code)))
    .limit(1)
  if (existing) throw new ConflictError('A curriculum with this code already exists')
  const [created] = await ctx.db.insert(curricula).values({
    schoolId: ctx.schoolId,
    code: data.code,
    name: data.name,
    description: data.description ?? null,
  }).returning()
  return created
}

export async function updateCurriculum(ctx: ServiceContext, id: string, data: z.infer<typeof updateCurriculumSchema>) {
  const [existing] = await ctx.db.select().from(curricula)
    .where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .limit(1)
  if (!existing) throw new NotFoundError('Curriculum')
  if (data.code && data.code !== existing.code) {
    const [duplicate] = await ctx.db.select({ id: curricula.id }).from(curricula)
      .where(and(eq(curricula.schoolId, ctx.schoolId), eq(curricula.code, data.code)))
      .limit(1)
    if (duplicate) throw new ConflictError('A curriculum with this code already exists')
  }
  const [updated] = await ctx.db.update(curricula).set({
    ...(data.code !== undefined && { code: data.code }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    updatedAt: new Date(),
  }).where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .returning()
  return updated
}

export async function deleteCurriculum(ctx: ServiceContext, id: string) {
  const [existing] = await ctx.db.select({ id: curricula.id }).from(curricula)
    .where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .limit(1)
  if (!existing) throw new NotFoundError('Curriculum')
  const [subjectCount] = await ctx.db.select({ count: sql<number>`count(*)` }).from(curriculumSubjects)
    .where(and(eq(curriculumSubjects.curriculumId, id), eq(curriculumSubjects.schoolId, ctx.schoolId)))
  if (Number(subjectCount.count) > 0) {
    throw new ConflictError('Cannot delete curriculum with subjects assigned. Remove subjects first.')
  }
  const [deleted] = await ctx.db.delete(curricula)
    .where(and(eq(curricula.id, id), eq(curricula.schoolId, ctx.schoolId)))
    .returning({ id: curricula.id })
  if (!deleted) throw new NotFoundError('Curriculum')
  return { deleted: true }
}

export async function setCurriculumSubjects(ctx: ServiceContext, curriculumId: string, subjectIds: string[]) {
  const [existing] = await ctx.db.select({ id: curricula.id }).from(curricula)
    .where(and(eq(curricula.id, curriculumId), eq(curricula.schoolId, ctx.schoolId)))
    .limit(1)
  if (!existing) throw new NotFoundError('Curriculum')

  await ctx.db.transaction(async (tx: any) => {
    await tx.delete(curriculumSubjects)
      .where(and(
        eq(curriculumSubjects.curriculumId, curriculumId),
        eq(curriculumSubjects.schoolId, ctx.schoolId),
      ))
    if (subjectIds.length > 0) {
      await tx.insert(curriculumSubjects).values(
        subjectIds.map((subjectId) => ({
          schoolId: ctx.schoolId,
          curriculumId,
          subjectId,
        })),
      )
    }
  })

  return getCurriculum(ctx, curriculumId)
}
