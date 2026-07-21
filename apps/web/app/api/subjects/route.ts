import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listSubjects, createSubject, createSubjectSchema } from '@/services/subjects';
import { db } from '@/lib/db';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const gradeLevelId = request.nextUrl.searchParams.get('gradeLevelId') ?? undefined;
  const data = await listSubjects({ db, schoolId: tenant.schoolId }, gradeLevelId);
  return apiSuccess(data);
});

export const POST = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = createSubjectSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await createSubject({ db, schoolId: tenant.schoolId }, parsed.data);
  return apiSuccess(data);
});
