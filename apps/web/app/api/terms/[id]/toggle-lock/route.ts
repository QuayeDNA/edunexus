import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { toggleTermLock, AppError } from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const term = await toggleTermLock({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
