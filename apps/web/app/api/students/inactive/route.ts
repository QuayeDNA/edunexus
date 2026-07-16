import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { students } from '@edunexus/database';
import { eq, inArray, and } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();

  const studentList = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    studentIdNumber: students.studentIdNumber,
    status: students.status,
  }).from(students)
    .where(and(
      eq(students.schoolId, schoolId),
      inArray(students.status, ['withdrawn', 'transferred_out']),
    ))
    .orderBy(students.lastName)
    .limit(1000);

  const filtered = search
    ? studentList.filter(s =>
        s.firstName.toLowerCase().includes(search) ||
        s.lastName.toLowerCase().includes(search) ||
        s.studentIdNumber.toLowerCase().includes(search)
      )
    : studentList;

  return apiSuccess({ students: filtered });
}
