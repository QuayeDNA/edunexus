import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import {
  getCurriculum, updateCurriculum, deleteCurriculum,
  updateCurriculumSchema,
} from '@/services/curricula';
import { db } from '@/lib/db';

export const GET = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await getCurriculum({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});

export const PATCH = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = updateCurriculumSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await updateCurriculum({ db, schoolId: tenant.schoolId }, params.id, parsed.data);
  return apiSuccess(data);
});

export const DELETE = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await deleteCurriculum({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});
