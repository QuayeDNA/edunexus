import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { getMatrix, saveMatrix, saveMatrixSchema } from '@/services/class-subject-teacher/class-subject-teacher';
import { db } from '@/lib/db';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId');
  const academicYearId = request.nextUrl.searchParams.get('academicYearId');
  if (!gradeLevelId) return apiError(400, 'gradeLevelId is required');
  if (!academicYearId) return apiError(400, 'academicYearId is required');

  const data = await getMatrix({ db, schoolId: tenant.schoolId }, gradeLevelId, academicYearId);
  return apiSuccess(data);
});

export const PUT = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json();
  const parsed = saveMatrixSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;

  const { gradeLevelId, academicYearId, assignments, force } = parsed.data;
  const result = await saveMatrix({ db, schoolId: tenant.schoolId }, gradeLevelId, assignments.map((a) => ({
    classId: a.classId,
    subjectId: a.subjectId,
    teacherId: a.teacherId ?? null,
  })), academicYearId, force);
  return apiSuccess(result);
});
