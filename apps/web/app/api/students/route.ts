import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { classes, academicYears, schools, students, enrollments, gradeLevels, studentGuardians, guardians } from '@edunexus/database';
import { eq, and, or, desc, count, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { createStudentFromData } from '@/services/student-creation';

const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: z.enum(['male', 'female'], { required_error: 'Gender is required' }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  classId: z.string().uuid('Class is required'),
  guardianName: z.string().min(1, 'Guardian name is required').max(200),
  guardianPhone: z.string().min(1, 'Guardian phone is required').max(20),
});

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() || '';
  const classId = searchParams.get('classId');
  const status = searchParams.get('status');
  const gradeLevelId = searchParams.get('gradeLevelId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  const conditions: any[] = [eq(students.schoolId, schoolId)];
  if (search) {
    conditions.push(or(
      ilike(students.firstName, `%${search}%`),
      ilike(students.lastName, `%${search}%`),
      ilike(students.studentIdNumber, `%${search}%`),
    ));
  }
  if (status) conditions.push(eq(students.status, status));

  const [totalResult] = await db.select({ count: count() }).from(students).where(and(...conditions));
  const total = Number(totalResult.count);

  const rows = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    otherNames: students.otherNames,
    studentIdNumber: students.studentIdNumber,
    gender: students.gender,
    status: students.status,
    enrollmentDate: students.enrollmentDate,
    className: classes.name,
    gradeLevelName: gradeLevels.name,
    guardianName: sql<string>`(
      SELECT CONCAT(g.first_name, ' ', g.last_name)
      FROM ${studentGuardians} sg
      JOIN ${guardians} g ON g.id = sg.guardian_id
      WHERE sg.student_id = ${students.id}
      ORDER BY g.is_primary DESC
      LIMIT 1
    )`,
  })
    .from(students)
    .leftJoin(enrollments, and(
      eq(enrollments.studentId, students.id),
      eq(enrollments.status, 'active'),
    ))
    .leftJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(gradeLevels, eq(gradeLevels.id, classes.gradeLevelId))
    .where(and(...conditions, gradeLevelId ? eq(classes.gradeLevelId, gradeLevelId) : undefined))
    .orderBy(students.lastName)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(rows, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json();
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [academicYear] = await db.select()
    .from(academicYears)
    .where(and(
      eq(academicYears.schoolId, schoolId),
      eq(academicYears.isCurrent, true),
    ))
    .limit(1);
  if (!academicYear) return apiError(500, 'No current academic year configured');

  const [targetClass] = await db.select()
    .from(classes)
    .where(and(
      eq(classes.id, parsed.data.classId),
      eq(classes.schoolId, schoolId),
    ))
    .limit(1);
  if (!targetClass) return apiError(404, 'Class not found');

  const [school] = await db.select({ code: schools.code })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  if (!school) return apiError(500, 'School not found');

  const result = await createStudentFromData({
    schoolId,
    schoolCode: school.code,
    academicYearId: academicYear.id,
    ...parsed.data,
  });

  return apiSuccess(result);
}
