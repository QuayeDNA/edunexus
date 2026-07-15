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

const updateApplicantSchema = z.object({
  status: z.enum(['under_review', 'accepted', 'rejected', 'waitlisted']).optional(),
  adminNotes: z.string().optional(),
  guardianName: z.string().min(1).max(200).optional(),
  guardianEmail: z.string().email().optional(),
  guardianPhone: z.string().max(20).optional(),
  guardianAddress: z.string().optional(),
  guardianOccupation: z.string().max(100).optional(),
  guardianEmployer: z.string().max(200).optional(),
  previousSchool: z.string().max(255).optional(),
  medicalAllergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  medicalMedications: z.string().optional(),
  doctorName: z.string().max(200).optional(),
  doctorPhone: z.string().max(20).optional(),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1).max(200),
    phone: z.string().min(1).max(20),
    relationship: z.string().min(1).max(50),
  })).optional(),
  siblingsEnrolled: z.boolean().optional(),
  siblingDetails: z.string().optional(),
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
  const parsed = updateApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.data.status) {
    const allowed = validTransitions[existing.status];
    if (!allowed || !allowed.includes(parsed.data.status)) {
      return apiError(422, `Cannot transition from '${existing.status}' to '${parsed.data.status}'`);
    }
    updateData.status = parsed.data.status;
  }

  const editableFields = [
    'adminNotes', 'guardianName', 'guardianEmail', 'guardianPhone',
    'guardianAddress', 'guardianOccupation', 'guardianEmployer',
    'previousSchool', 'medicalAllergies', 'medicalConditions',
    'medicalMedications', 'doctorName', 'doctorPhone',
    'emergencyContacts', 'siblingsEnrolled', 'siblingDetails',
  ] as const;

  for (const field of editableFields) {
    if (field in parsed.data && parsed.data[field as keyof typeof parsed.data] !== undefined) {
      const val = parsed.data[field as keyof typeof parsed.data];
      updateData[field] = val ?? null;
    }
  }

  const [updated] = await db.update(applicants)
    .set(updateData)
    .where(eq(applicants.id, id))
    .returning();

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await db.insert(auditLogs).values({
      schoolId,
      userId: user!.id,
      action: 'applicant.status_changed',
      tableName: 'applicants',
      recordId: id,
      oldData: { status: existing.status },
      newData: { status: parsed.data.status },
    });
  }

  if (Object.keys(updateData).length > 1) {
    await db.insert(auditLogs).values({
      schoolId,
      userId: user!.id,
      action: 'applicant.updated',
      tableName: 'applicants',
      recordId: id,
      oldData: {},
      newData: updateData,
    });
  }

  return apiSuccess(updated);
}
