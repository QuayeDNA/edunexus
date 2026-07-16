import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { students, enrollments, classes, academicYears, studentGuardians, guardians } from '@edunexus/database';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

const updateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  otherNames: z.string().max(100).nullable().optional(),
  gender: z.enum(['male', 'female']).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  placeOfBirth: z.string().max(100).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  religion: z.string().max(50).nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).nullable().optional(),
  medicalNotes: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [student] = await db.select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
    .limit(1);
  if (!student) return apiError(404, 'Student not found');

  const enrollmentRows = await db.select({
    id: enrollments.id,
    className: classes.name,
    academicYearName: academicYears.name,
    status: enrollments.status,
    enrollmentDate: enrollments.enrollmentDate,
    endDate: enrollments.endDate,
  })
    .from(enrollments)
    .leftJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
    .where(and(eq(enrollments.studentId, id), eq(enrollments.schoolId, schoolId)))
    .orderBy(desc(enrollments.enrollmentDate));

  const guardianRows = await db.select({
    id: guardians.id,
    firstName: guardians.firstName,
    lastName: guardians.lastName,
    relationship: studentGuardians.relationship,
    phone: guardians.phone,
    email: guardians.email,
    occupation: guardians.occupation,
    isPrimary: guardians.isPrimary,
  })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(eq(studentGuardians.studentId, id));

  return apiSuccess({
    ...student,
    dateOfBirth: student.dateOfBirth,
    enrollmentDate: student.enrollmentDate,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
    enrollments: enrollmentRows,
    guardians: guardianRows,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [existing] = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
    .limit(1);
  if (!existing) return apiError(404, 'Student not found');

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [updated] = await db.update(students)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(students.id, id))
    .returning();

  return apiSuccess({
    ...updated,
    dateOfBirth: updated.dateOfBirth,
    enrollmentDate: updated.enrollmentDate,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
