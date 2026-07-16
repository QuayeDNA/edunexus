import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { students, enrollments } from '@edunexus/database';
import { eq, inArray, and, or, ilike } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

const INACTIVE_STATUSES = ['withdrawn', 'transferred_out'] as const;

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const statusFilter = searchParams.get('status');

  const statuses = statusFilter && (statusFilter === 'withdrawn' || statusFilter === 'transferred_out')
    ? [statusFilter]
    : [...INACTIVE_STATUSES];

  const conditions: any[] = [
    eq(students.schoolId, schoolId),
    inArray(students.status, statuses),
  ];
  if (search) {
    conditions.push(or(
      ilike(students.firstName, `%${search}%`),
      ilike(students.lastName, `%${search}%`),
      ilike(students.studentIdNumber, `%${search}%`),
    ));
  }

  const studentList = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    studentIdNumber: students.studentIdNumber,
    status: students.status,
  }).from(students)
    .where(and(...conditions))
    .orderBy(students.lastName)
    .limit(1000);

  const enrollmentList = await db.select({
    studentId: enrollments.studentId,
    endDate: enrollments.endDate,
    status: enrollments.status,
    transferReason: enrollments.transferReason,
    transferSchoolName: enrollments.transferSchoolName,
  }).from(enrollments)
    .where(and(
      eq(enrollments.schoolId, schoolId),
      inArray(enrollments.status, statuses),
    ))
    .orderBy(enrollments.endDate)
    .limit(10000);

  const latestEnrollments = new Map<string, typeof enrollmentList[0]>();
  for (const e of enrollmentList) {
    if (!latestEnrollments.has(e.studentId)) {
      latestEnrollments.set(e.studentId, e);
    }
  }

  const studentsWithEnrollments = studentList.map(s => ({
    ...s,
    lastEnrollment: latestEnrollments.get(s.id) ?? null,
  }));

  return apiSuccess({ students: studentsWithEnrollments });
}
