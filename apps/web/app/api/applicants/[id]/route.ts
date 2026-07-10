import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { applicants, auditLogs } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

const validTransitions: Record<string, string[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['accepted', 'rejected', 'waitlisted'],
  waitlisted: ['accepted', 'rejected'],
};

const updateStatusSchema = z.object({
  status: z.enum(['under_review', 'accepted', 'rejected', 'waitlisted']),
  adminNotes: z.string().optional(),
});

async function resolveSchoolId(request: NextRequest): Promise<string | null> {
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  return tenant.schoolId;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const schoolId = await resolveSchoolId(request);
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [applicant] = await db.select().from(applicants).where(and(
    eq(applicants.id, id),
    eq(applicants.schoolId, schoolId),
  )).limit(1);

  if (!applicant) return apiError(404, 'Applicant not found');
  return apiSuccess(applicant);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error: authError, user } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const schoolId = await resolveSchoolId(request);
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [existing] = await db.select().from(applicants).where(and(
    eq(applicants.id, id),
    eq(applicants.schoolId, schoolId),
  )).limit(1);
  if (!existing) return apiError(404, 'Applicant not found');

  const body = await request.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const allowed = validTransitions[existing.status];
  if (!allowed || !allowed.includes(parsed.data.status)) {
    return apiError(422, `Cannot transition from '${existing.status}' to '${parsed.data.status}'`);
  }

  const [updated] = await db.update(applicants)
    .set({
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes !== undefined ? parsed.data.adminNotes : existing.adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(applicants.id, id))
    .returning();

  await db.insert(auditLogs).values({
    schoolId,
    userId: user!.id,
    action: 'applicant.status_changed',
    tableName: 'applicants',
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: parsed.data.status },
  });

  return apiSuccess(updated);
}
