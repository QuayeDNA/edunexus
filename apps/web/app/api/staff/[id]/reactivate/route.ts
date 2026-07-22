import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { reactivateStaff } from '@/services/staff/staff';
import { db } from '@/lib/db';

export const POST = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await reactivateStaff({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});
