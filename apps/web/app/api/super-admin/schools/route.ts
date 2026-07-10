import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { schools, academicYears, terms, gradeLevels, auditLogs } from '@edunexus/database/src/schema';
import { desc, eq, like, and, count } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const createSchoolSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  code: z.string().min(2).max(20),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  region: z.string().max(100).optional(),
  curriculum: z.string().max(50).default('ghana_basic'),
  calendar: z.string().max(50).default('ghana_3_terms'),
});

export async function GET(request: NextRequest) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const conditions = and(
    search ? like(schools.name, `%${search}%`) : undefined,
    status === 'active' ? eq(schools.isActive, true) : undefined,
    status === 'inactive' ? eq(schools.isActive, false) : undefined,
  );

  const [total] = await db
    .select({ count: count() })
    .from(schools)
    .where(conditions);

  const schoolList = await db
    .select()
    .from(schools)
    .where(conditions)
    .orderBy(desc(schools.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(schoolList, {
    page,
    pageSize,
    total: Number(total.count),
    totalPages: Math.ceil(Number(total.count) / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const { error: authError, user } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = createSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { name, slug, code, email, phone, address, region, curriculum, calendar } = parsed.data;

  const [existingSlug] = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
  if (existingSlug) {
    return apiError(409, 'A school with this slug already exists');
  }

  const [school] = await db.insert(schools).values({
    name, slug, code, email: email || null, phone: phone || null, address: address || null, region: region || null, curriculum, calendar,
    isActive: true,
  }).returning();

  const year = new Date().getFullYear();
  const [academicYear] = await db.insert(academicYears).values({
    schoolId: school.id,
    name: `${year}/${year + 1}`,
    startDate: new Date(year, 8, 1),
    endDate: new Date(year + 1, 6, 31),
    isCurrent: true,
  }).returning();

  const termData = [
    { termNumber: '1', name: 'First Term', startDate: new Date(year, 8, 1), endDate: new Date(year, 11, 20) },
    { termNumber: '2', name: 'Second Term', startDate: new Date(year + 1, 0, 7), endDate: new Date(year + 1, 3, 11) },
    { termNumber: '3', name: 'Third Term', startDate: new Date(year + 1, 4, 5), endDate: new Date(year + 1, 6, 31) },
  ];
  await db.insert(terms).values(
    termData.map((t) => ({ schoolId: school.id, academicYearId: academicYear.id, ...t, isCurrent: t.termNumber === '1' }))
  );

  const gradeData = [
    { code: 'KG1', name: 'Kindergarten 1', level: 0, category: 'kindergarten', sortOrder: 1 },
    { code: 'KG2', name: 'Kindergarten 2', level: 0, category: 'kindergarten', sortOrder: 2 },
    { code: 'P1', name: 'Primary 1', level: 1, category: 'primary', sortOrder: 3 },
    { code: 'P2', name: 'Primary 2', level: 2, category: 'primary', sortOrder: 4 },
    { code: 'P3', name: 'Primary 3', level: 3, category: 'primary', sortOrder: 5 },
    { code: 'P4', name: 'Primary 4', level: 4, category: 'primary', sortOrder: 6 },
    { code: 'P5', name: 'Primary 5', level: 5, category: 'primary', sortOrder: 7 },
    { code: 'P6', name: 'Primary 6', level: 6, category: 'primary', sortOrder: 8 },
    { code: 'JHS1', name: 'Junior High School 1', level: 7, category: 'junior_high', sortOrder: 9 },
    { code: 'JHS2', name: 'Junior High School 2', level: 8, category: 'junior_high', sortOrder: 10 },
    { code: 'JHS3', name: 'Junior High School 3', level: 9, category: 'junior_high', sortOrder: 11 },
  ];
  await db.insert(gradeLevels).values(
    gradeData.map((g) => ({ schoolId: school.id, ...g }))
  );

  await db.insert(auditLogs).values({
    schoolId: school.id,
    userId: user!.id,
    action: 'school.created',
    tableName: 'schools',
    recordId: school.id,
    newData: { name, slug, code },
  });

  return apiSuccess(school);
}
