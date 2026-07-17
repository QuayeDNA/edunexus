import { NextRequest } from 'next/server';
import { z } from 'zod';
import { routeHandler } from '@/lib/api/handler';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateEnrollmentStatus } from '@/services/enrollment-lifecycle';
import { generateTransferCertificate } from '@/services/transfer-certificate';
import { createStorageProvider } from '@/services/storage';
import { db } from '@/lib/db';
import { enrollments, students, schools, classes } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { resolveTenant } from '@/lib/tenant/resolve';

const schema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  targetSchoolName: z.string().min(1, 'Target school name is required'),
});

export const POST = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const { id } = params;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw parsed.error;

  const result = await updateEnrollmentStatus({
    enrollmentId: id,
    schoolId,
    newStatus: 'transferred_out',
    reason: parsed.data.reason,
    targetSchoolName: parsed.data.targetSchoolName,
  });

  const [enrollment] = await db.select()
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  const [student] = await db.select()
    .from(students)
    .where(eq(students.id, enrollment.studentId))
    .limit(1);

  const [school] = await db.select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  const [classRecord] = await db.select({ name: classes.name })
    .from(classes)
    .where(eq(classes.id, enrollment.classId))
    .limit(1);

  const pdfBuffer = await generateTransferCertificate({
    studentName: `${student.firstName} ${student.lastName}`,
    studentIdNumber: student.studentIdNumber,
    dateOfBirth: student.dateOfBirth,
    lastClass: classRecord?.name ?? enrollment.classId,
    reason: parsed.data.reason,
    targetSchool: parsed.data.targetSchoolName,
    transferDate: new Date().toISOString().split('T')[0],
    schoolName: school?.name ?? 'School',
  });

  const storage = createStorageProvider();
  const uploadResult = await storage.upload(
    pdfBuffer,
    `transfer-certificates/${enrollment.id}.pdf`,
    'application/pdf',
  );

  return apiSuccess({
    ...result,
    transferCertificateUrl: uploadResult.url,
  });
});
