import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import {
  getTerm, updateTerm, deleteTerm, updateTermSchema, AppError,
} from '@/services/academic-structure';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = _request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;

  try {
    const term = await getTerm({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireRole('admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (!tenant.schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = await params;
  const body = await request.json();
  const parsed = updateTermSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const term = await updateTerm({ db, schoolId: tenant.schoolId }, id, parsed.data);
    return apiSuccess(term);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}

export async function DELETE(
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
    const result = await deleteTerm({ db, schoolId: tenant.schoolId }, id);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) return apiError(error.statusCode, error.message);
    throw error;
  }
}
