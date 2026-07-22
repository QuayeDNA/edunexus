import { z } from 'zod';
import { eq, and, inArray, isNull } from 'drizzle-orm';
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
    teacherId: z.string().nullable(),
  })).default([]),
});

export async function getMatrix(ctx: ServiceContext, gradeLevelId: string, academicYearId: string): Promise<MatrixData> {
  const classRows = await ctx.db.select({ id: classes.id, name: classes.name, code: classes.code })
    .from(classes)
    .where(and(eq(classes.schoolId, ctx.schoolId), eq(classes.gradeLevelId, gradeLevelId), eq(classes.academicYearId, academicYearId), isNull(classes.deletedAt)))
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

  const classIds = classRows.map((c: { id: string }) => c.id);
  const assignmentRows = classIds.length > 0
    ? await ctx.db.select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId, teacherId: classSubjects.teacherId })
        .from(classSubjects)
        .where(and(eq(classSubjects.schoolId, ctx.schoolId), inArray(classSubjects.classId, classIds)))
    : [];

  return {
    classes: classRows,
    subjects: subjectRows,
    assignments: assignmentRows.map((a: { classId: string; subjectId: string; teacherId: string | null }) => ({ ...a, teacherId: a.teacherId ?? null })),
  };
}

export async function saveMatrix(ctx: ServiceContext, gradeLevelId: string, assignments: MatrixAssignment[]): Promise<SaveResult> {
  const errors: { classId: string; subjectId: string; error: string }[] = [];
  const validAssignments: MatrixAssignment[] = [];

  for (const a of assignments) {
    const validatedTeacherId = await validateTeacher(ctx, a.teacherId);
    if (a.teacherId && validatedTeacherId !== a.teacherId) {
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
