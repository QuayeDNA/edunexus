import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { academicYears, classes, schools } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { resolveTenant } from '@/lib/tenant/resolve';
import { parseCsv } from '@/services/csv-parser';
import { createStudentFromData } from '@/services/student-creation';

const rowSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female'], { message: 'Must be male or female' }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  classCode: z.string().min(1, 'Required'),
  guardianName: z.string().min(1, 'Required'),
  guardianPhone: z.string().min(1, 'Required').max(20),
});

function applyMapping(headers: string[], cells: string[], mapping: Record<string, string>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const field = mapping[headers[i]];
    if (field) {
      fields[field] = cells[i] ?? '';
    }
  }
  return fields;
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const host = request.headers.get('host') ?? '';
  const tenant = await resolveTenant(host);
  const schoolId = tenant.schoolId;
  if (!schoolId) return apiError(400, 'Tenant not resolved');

  const body = await request.json();
  if (!body.csv || typeof body.csv !== 'string') {
    return apiError(422, 'CSV content is required');
  }
  if (!body.mapping || typeof body.mapping !== 'object') {
    return apiError(422, 'Column mapping is required');
  }

  const [academicYear] = await db.select()
    .from(academicYears)
    .where(and(
      eq(academicYears.schoolId, schoolId),
      eq(academicYears.isCurrent, true),
    ))
    .limit(1);
  if (!academicYear) return apiError(500, 'No current academic year configured');

  const allClasses = await db.select()
    .from(classes)
    .where(eq(classes.schoolId, schoolId));

  const [school] = await db.select({ code: schools.code })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  if (!school) return apiError(500, 'School not found');

  const parseResult = parseCsv(body.csv);
  if (parseResult.headers.length === 0) {
    return apiError(422, 'CSV must have at least a header row');
  }

  const mapping: Record<string, string> = body.mapping;
  const results: Array<{ rowNumber: number; status: 'imported' | 'failed'; studentId?: string; error?: string }> = [];
  let imported = 0;
  let failed = 0;

  for (const row of parseResult.rows) {
    const mapped = applyMapping(parseResult.headers, row.cells, mapping);
    const parsed = rowSchema.safeParse(mapped);

    if (!parsed.success) {
      failed++;
      results.push({
        rowNumber: row.index,
        status: 'failed',
        error: Object.values(parsed.error.flatten().fieldErrors).flat().join('; ') || 'Validation failed',
      });
      continue;
    }

    const matchedClass = allClasses.find(c => c.code === parsed.data.classCode);
    if (!matchedClass) {
      failed++;
      results.push({
        rowNumber: row.index,
        status: 'failed',
        error: `Class "${parsed.data.classCode}" not found`,
      });
      continue;
    }

    try {
      const created = await createStudentFromData({
        schoolId,
        schoolCode: school.code,
        academicYearId: academicYear.id,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        gender: parsed.data.gender,
        dateOfBirth: parsed.data.dateOfBirth,
        classId: matchedClass.id,
        guardianName: parsed.data.guardianName,
        guardianPhone: parsed.data.guardianPhone,
      });
      imported++;
      results.push({
        rowNumber: row.index,
        status: 'imported',
        studentId: created.student.id,
      });
    } catch (err) {
      failed++;
      results.push({
        rowNumber: row.index,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return apiSuccess({ imported, failed, total: results.length, results });
}
