import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { listGradeLevels, createGradeLevel, createGradeLevelSchema } from '@/services/grade-levels';
import { AppError } from '@/lib/api/errors';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  try {
    const data = await listGradeLevels({ db, schoolId: tenant.schoolId });
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json();
  const parsed = createGradeLevelSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const data = await createGradeLevel({ db, schoolId: tenant.schoolId }, parsed.data);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
