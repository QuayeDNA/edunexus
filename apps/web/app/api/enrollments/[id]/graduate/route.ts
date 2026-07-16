import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateEnrollmentStatus, type EnrollmentLifecycleResult } from '@/services/enrollment-lifecycle';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const { id } = await params;

  try {
    const result = await updateEnrollmentStatus({
      enrollmentId: id,
      newStatus: 'graduated',
    });
    return apiSuccess(result);
  } catch (err: any) {
    if (err.message === 'Enrollment not found') return apiError(404, err.message);
    return apiError(422, err.message);
  }
}
