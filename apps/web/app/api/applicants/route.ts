import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { applicants, gradeLevels, auditLogs, mediaFiles } from '@edunexus/database';
import { eq, and, or, desc, count, inArray, ilike, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { sendEmail } from '@/services/email';
import { applicationConfirmationEmail } from '@/services/email/templates/application-confirmation';
import { resolveTenant } from '@/lib/tenant/resolve';
import { anonymizeApplicant } from '@/services/anonymize';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

const createApplicantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').refine(val => {
    const [y, m, d] = val.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }, 'Invalid date'),
  gender: z.enum(['male', 'female']),
  guardianName: z.string().min(1).max(200),
  guardianEmail: z.string().email(),
  guardianPhone: z.string().max(20).optional().or(z.literal('')),
  guardianAddress: z.string().optional().or(z.literal('')),
  gradeLevelId: z.string().uuid(),
  previousSchool: z.string().max(255).optional().or(z.literal('')),
  birthCertificateFileId: z.string().uuid().optional().nullable(),
  priorReportCardFileId: z.string().uuid().optional().nullable(),
  photoFileId: z.string().uuid().optional().nullable(),
  guardianOccupation: z.string().max(100).optional().or(z.literal('')),
  guardianEmployer: z.string().max(200).optional().or(z.literal('')),
  medicalAllergies: z.string().optional().or(z.literal('')),
  medicalConditions: z.string().optional().or(z.literal('')),
  medicalMedications: z.string().optional().or(z.literal('')),
  doctorName: z.string().max(200).optional().or(z.literal('')),
  doctorPhone: z.string().max(20).optional().or(z.literal('')),
  emergencyContacts: z.array(z.object({
    name: z.string().min(1).max(200),
    phone: z.string().min(1).max(20),
    relationship: z.string().min(1).max(50),
  })).optional().default([]),
  siblingsEnrolled: z.boolean().optional(),
  siblingDetails: z.string().optional().or(z.literal('')),
});

async function resolveSchoolId(request: NextRequest): Promise<string | null> {
  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  if (tenant.schoolId) return tenant.schoolId;
  return request.headers.get('x-tenant-id') ?? null;
}

export async function POST(request: NextRequest) {
  const schoolId = await resolveSchoolId(request);
  if (!schoolId) {
    return apiError(400, 'Tenant not resolved');
  }

  const body = await request.json();
  const parsed = createApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [gradeLevel] = await db.select().from(gradeLevels).where(and(
    eq(gradeLevels.id, parsed.data.gradeLevelId),
    eq(gradeLevels.schoolId, schoolId),
  ));
  if (!gradeLevel) {
    return apiError(422, 'Invalid grade level');
  }

  const existingRejected = await db
    .select({ id: applicants.id, createdAt: applicants.createdAt })
    .from(applicants)
    .where(and(
      eq(applicants.schoolId, schoolId),
      eq(applicants.guardianEmail, parsed.data.guardianEmail),
      eq(applicants.status, 'rejected'),
      isNull(applicants.anonymizedAt),
    ))
    .orderBy(desc(applicants.createdAt))
    .limit(1);

  if (existingRejected.length > 0) {
    const cooldownEnd = new Date(existingRejected[0].createdAt.getTime() + 180 * 24 * 60 * 60 * 1000);
    if (cooldownEnd > new Date()) {
      return apiError(
        409,
        `You may re-apply after ${cooldownEnd.toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      );
    }
    await anonymizeApplicant(db, existingRejected[0].id);
  }

  const [applicant] = await db.insert(applicants).values({
    schoolId,
    ...parsed.data,
    dateOfBirth: parsed.data.dateOfBirth,
    guardianPhone: parsed.data.guardianPhone || null,
    guardianAddress: parsed.data.guardianAddress || null,
    guardianOccupation: parsed.data.guardianOccupation || null,
    guardianEmployer: parsed.data.guardianEmployer || null,
    previousSchool: parsed.data.previousSchool || null,
    medicalAllergies: parsed.data.medicalAllergies || null,
    medicalConditions: parsed.data.medicalConditions || null,
    medicalMedications: parsed.data.medicalMedications || null,
    doctorName: parsed.data.doctorName || null,
    doctorPhone: parsed.data.doctorPhone || null,
    emergencyContacts: parsed.data.emergencyContacts.length > 0 ? parsed.data.emergencyContacts : null,
    siblingsEnrolled: parsed.data.siblingsEnrolled ?? false,
    siblingDetails: parsed.data.siblingDetails || null,
  }).returning();

  const fileIds = [
    parsed.data.birthCertificateFileId,
    parsed.data.priorReportCardFileId,
    parsed.data.photoFileId,
  ].filter(Boolean) as string[];

  if (fileIds.length > 0) {
    await db.update(mediaFiles).set({ entityId: applicant.id })
      .where(inArray(mediaFiles.id, fileIds));
  }

  await db.insert(auditLogs).values({
    schoolId,
    userId: SYSTEM_USER_ID,
    action: 'INSERT',
    tableName: 'applicants',
    recordId: applicant.id,
    newData: { status: 'submitted', firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  try {
    await sendEmail({
      to: parsed.data.guardianEmail,
      subject: 'Application Received — EduNexus',
      html: applicationConfirmationEmail({
        guardianName: parsed.data.guardianName,
        studentName: `${parsed.data.firstName} ${parsed.data.lastName}`,
      }),
    });
  } catch {
    console.error('[APPLICANT] Failed to send confirmation email for', applicant.id);
  }

  return apiSuccess({ id: applicant.id, status: applicant.status });
}

export async function GET(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const schoolId = await resolveSchoolId(request);
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const gradeLevelId = searchParams.get('gradeLevelId');
  const search = searchParams.get('search')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  const conditions = [eq(applicants.schoolId, schoolId)];
  if (status) conditions.push(eq(applicants.status, status));
  if (gradeLevelId) conditions.push(eq(applicants.gradeLevelId, gradeLevelId));
  if (search) {
    const pattern = `%${search}%`;
    const searchCondition = or(
      ilike(applicants.firstName, pattern),
      ilike(applicants.lastName, pattern),
      ilike(applicants.guardianName, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const [totalResult] = await db.select({ count: count() }).from(applicants).where(and(...conditions));
  const total = Number(totalResult.count);

  const rows = await db.select()
    .from(applicants)
    .where(and(...conditions))
    .orderBy(desc(applicants.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(rows, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
