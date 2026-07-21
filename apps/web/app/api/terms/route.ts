import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import {
  listTerms, createTerm, createTermSchema,
} from '@/services/academic-structure';
import { AppError } from '@/lib/api/errors';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  if (!academicYearId) return apiError(400, 'academicYearId query parameter is required');

  try {
    const rows = await listTerms({ db, schoolId: tenant.schoolId }, academicYearId);
    return apiSuccess(rows);
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
  const parsed = createTermSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const term = await createTerm({ db, schoolId: tenant.schoolId }, parsed.data);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
