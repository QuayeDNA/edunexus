import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { applicants, classes, auditLogs } from '@edunexus/database';
import { eq, and, count } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

const acceptSchema = z.object({
  targetClassId: z.string().uuid(),
  adminNotes: z.string().optional(),
  sendEmail: z.boolean().default(false),
  override: z.boolean().default(false),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error: authError, user } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const [existing] = await db.select().from(applicants).where(and(
    eq(applicants.id, id),
    eq(applicants.schoolId, schoolId),
  )).limit(1);
  if (!existing) return apiError(404, 'Applicant not found');

  if (existing.status !== 'under_review' && existing.status !== 'waitlisted') {
    return apiError(422, `Cannot accept from '${existing.status}' — must be 'under_review' or 'waitlisted'`);
  }

  const body = await request.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [targetClass] = await db.select().from(classes).where(and(
    eq(classes.id, parsed.data.targetClassId),
    eq(classes.schoolId, schoolId),
  )).limit(1);
  if (!targetClass) return apiError(404, 'Target class not found');

  if (targetClass.gradeLevelId !== existing.gradeLevelId) {
    return apiError(422, 'Target class does not match applicant\'s grade level');
  }

  const [acceptedResult] = await db
    .select({ count: count() })
    .from(applicants)
    .where(and(
      eq(applicants.targetClassId, parsed.data.targetClassId),
      eq(applicants.status, 'accepted'),
    ));
  const acceptedCount = Number(acceptedResult.count);
  const capacity = targetClass.capacity ?? 999;
  const available = capacity - acceptedCount;

  if (available <= 0 && !parsed.data.override) {
    return apiError(409, `Class '${targetClass.name}' is at capacity (${acceptedCount}/${capacity}). Please select a different class or enable override to confirm.`);
  }

  const [updated] = await db.update(applicants)
    .set({
      status: 'accepted',
      targetClassId: parsed.data.targetClassId,
      adminNotes: parsed.data.adminNotes !== undefined ? parsed.data.adminNotes : existing.adminNotes,
      updatedAt: new Date(),
    })
    .where(eq(applicants.id, id))
    .returning();

  await db.insert(auditLogs).values({
    schoolId,
    userId: user!.id,
    action: 'applicant.accepted',
    tableName: 'applicants',
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: 'accepted', targetClassId: parsed.data.targetClassId },
  });

  if (parsed.data.sendEmail) {
    // Email dispatch placeholder — will use sendEmail() from services
    // once template is created (future task)
  }

  return apiSuccess(updated);
}
