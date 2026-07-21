import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { setCurriculumSubjects, setCurriculumSubjectsSchema } from '@/services/curricula';
import { db } from '@/lib/db';

export const PUT = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = setCurriculumSubjectsSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await setCurriculumSubjects({ db, schoolId: tenant.schoolId }, params.id, parsed.data.subjectIds);
  return apiSuccess(data);
});
