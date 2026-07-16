import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { students, enrollments, classes, academicYears } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';

const schema = z.object({
  classId: z.string().uuid('Valid class ID is required'),
  academicYearId: z.string().uuid('Valid academic year ID is required'),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as any);

  const [student] = await db.select()
    .from(students)
    .where(and(eq(students.id, params.id), eq(students.schoolId, schoolId)))
    .limit(1);

  if (!student) return apiError(404, 'Student not found');
  if (student.status === 'active') return apiError(422, 'Student is already active');
  if (!['withdrawn', 'transferred_out'].includes(student.status!)) return apiError(422, `Cannot re-admit student with status '${student.status}'`);

  const [targetClass] = await db.select()
    .from(classes)
    .where(and(eq(classes.id, parsed.data.classId), eq(classes.schoolId, schoolId)))
    .limit(1);
  if (!targetClass) return apiError(404, 'Class not found');

  const [academicYear] = await db.select()
    .from(academicYears)
    .where(and(eq(academicYears.id, parsed.data.academicYearId), eq(academicYears.schoolId, schoolId)))
    .limit(1);
  if (!academicYear) return apiError(404, 'Academic year not found');

  const [enrollment] = await db.insert(enrollments).values({
    schoolId,
    studentId: student.id,
    classId: targetClass.id,
    academicYearId: academicYear.id,
    status: 'active',
    enrollmentDate: new Date().toISOString().split('T')[0],
  }).returning();

  await db.update(students)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(students.id, student.id));

  return apiSuccess({
    enrollment: { id: enrollment.id, status: enrollment.status, classId: enrollment.classId, academicYearId: enrollment.academicYearId },
    student: { id: student.id, status: 'active' },
  });
}
