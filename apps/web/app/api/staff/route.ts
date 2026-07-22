import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listStaff, createStaff, createStaffSchema } from '@/services/staff/staff';
import { db } from '@/lib/db';

export const GET = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const search = request.nextUrl.searchParams.get('search') ?? undefined;
  const department = request.nextUrl.searchParams.get('department') ?? undefined;
  const role = request.nextUrl.searchParams.get('role') ?? undefined;
  const status = request.nextUrl.searchParams.get('status') ?? undefined;
  const data = await listStaff({ db, schoolId: tenant.schoolId }, { search, department, role, status });
  return apiSuccess(data);
});

export const POST = routeHandler(async (request: NextRequest) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await createStaff({ db, schoolId: tenant.schoolId }, parsed.data);
  return apiSuccess(data);
});
