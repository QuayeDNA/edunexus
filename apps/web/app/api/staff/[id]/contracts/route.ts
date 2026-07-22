import { NextRequest } from 'next/server';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listContracts, createContract, createContractSchema } from '@/services/staff/employment-contracts';
import { db } from '@/lib/db';

export const GET = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;
  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const data = await listContracts({ db, schoolId: tenant.schoolId }, params.id);
  return apiSuccess(data);
});

export const POST = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');
  const body = await request.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) throw parsed.error;
  const data = await createContract({ db, schoolId: tenant.schoolId }, params.id, parsed.data);
  return apiSuccess(data);
});
