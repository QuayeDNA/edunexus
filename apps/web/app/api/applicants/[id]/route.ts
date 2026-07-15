import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { applicants, auditLogs } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { sendEmail } from '@/services/email';
import { applicationUnderReviewEmail } from '@/services/email/templates/application-under-review';
import { applicationAcceptedEmail } from '@/services/email/templates/application-accepted';
import { applicationRejectedEmail } from '@/services/email/templates/application-rejected';
import { applicationWaitlistedEmail } from '@/services/email/templates/application-waitlisted';

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

    const cooldownEnd = parsed.data.status === 'rejected'
      ? new Date(existing.createdAt.getTime() + 180 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })
      : undefined;

    const emailContent = (() => {
      switch (parsed.data.status) {
        case 'under_review':
          return {
            subject: 'Application Under Review — EduNexus',
            html: applicationUnderReviewEmail({
              guardianName: existing.guardianName ?? 'Parent/Guardian',
              studentName: `${existing.firstName} ${existing.lastName}`,
            }),
          };
        case 'accepted':
          return {
            subject: 'Congratulations — Application Accepted — EduNexus',
            html: applicationAcceptedEmail({
              guardianName: existing.guardianName ?? 'Parent/Guardian',
              studentName: `${existing.firstName} ${existing.lastName}`,
              schoolName: 'the school',
            }),
          };
        case 'rejected':
          return {
            subject: 'Application Status Update — EduNexus',
            html: applicationRejectedEmail({
              guardianName: existing.guardianName ?? 'Parent/Guardian',
              studentName: `${existing.firstName} ${existing.lastName}`,
              cooldownDate: cooldownEnd!,
            }),
          };
        case 'waitlisted':
          return {
            subject: 'Application Waitlisted — EduNexus',
            html: applicationWaitlistedEmail({
              guardianName: existing.guardianName ?? 'Parent/Guardian',
              studentName: `${existing.firstName} ${existing.lastName}`,
            }),
          };
        default:
          return null;
      }
    })();

    if (emailContent && existing.guardianEmail) {
      sendEmail({
        to: existing.guardianEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch(err => {
        console.error(`[APPLICANT] Failed to send ${parsed.data.status} email for ${id}:`, err);
      });
    }

  const nonAuditKeys = ['updatedAt', 'status'];
  const changedFields = Object.keys(updateData).filter(k => !nonAuditKeys.includes(k));
  if (changedFields.length > 0) {
    const loggedData: Record<string, unknown> = {};
    for (const key of changedFields) {
      loggedData[key] = updateData[key];
    }
    await db.insert(auditLogs).values({
      schoolId,
      userId: user!.id,
      action: 'applicant.updated',
      tableName: 'applicants',
      recordId: id,
      oldData: {},
      newData: loggedData,
    });
  }

  return apiSuccess(updated);
}
