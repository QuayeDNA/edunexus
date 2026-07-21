import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listGradeLevelSubjects, setGradeLevelSubjects, setGradeLevelSubjectsSchema } from '@/services/subject-grade-levels';
import { db } from '@/lib/db';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId');
  if (!gradeLevelId) return apiError(400, 'gradeLevelId query parameter required');
  const data = await listGradeLevelSubjects({ db, schoolId: tenant.schoolId }, gradeLevelId);
  return apiSuccess(data);
});

export const PUT = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId');
  if (!gradeLevelId) return apiError(400, 'gradeLevelId query parameter required');
  const body = await request.json();
  const parsed = setGradeLevelSubjectsSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await setGradeLevelSubjects({ db, schoolId: tenant.schoolId }, gradeLevelId, parsed.data.subjectIds);
  return apiSuccess(data);
});
