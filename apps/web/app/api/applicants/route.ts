import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { applicants, gradeLevels } from '@edunexus/database';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { sendEmail } from '@/services/email';
import { applicationConfirmationEmail } from '@/services/email/templates/application-confirmation';

const createApplicantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  gender: z.enum(['male', 'female']),
  guardianName: z.string().min(1).max(200),
  guardianEmail: z.string().email(),
  guardianPhone: z.string().max(20).optional().or(z.literal('')),
  guardianAddress: z.string().optional().or(z.literal('')),
  gradeLevelId: z.string().uuid(),
  previousSchool: z.string().max(255).optional().or(z.literal('')),
  documentUrls: z.array(z.string().url()).optional().default([]),
});

export async function POST(request: NextRequest) {
  const schoolId = request.headers.get('x-tenant-id');
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

  const [applicant] = await db.insert(applicants).values({
    schoolId,
    ...parsed.data,
    dateOfBirth: parsed.data.dateOfBirth,
    guardianPhone: parsed.data.guardianPhone || null,
    guardianAddress: parsed.data.guardianAddress || null,
    previousSchool: parsed.data.previousSchool || null,
    documentUrls: parsed.data.documentUrls.length > 0 ? parsed.data.documentUrls : null,
  }).returning();

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

  const schoolId = request.headers.get('x-tenant-id');
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const gradeLevelId = searchParams.get('gradeLevelId');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

  const conditions = [eq(applicants.schoolId, schoolId)];
  if (status) conditions.push(eq(applicants.status, status));
  if (gradeLevelId) conditions.push(eq(applicants.gradeLevelId, gradeLevelId));

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
