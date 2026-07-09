import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { profiles, schools, auditLogs } from '@edunexus/database/src/schema';
import { desc, eq, like, and, count } from 'drizzle-orm';
import { z } from 'zod';
import { scryptSync, randomBytes } from 'crypto';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';
import { sendEmail } from '@/services/email';
import { welcomeAdminEmail } from '@/services/email/templates/welcome-admin';

const createUserSchema = z.object({
  schoolId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['admin', 'teacher', 'student', 'parent']).default('admin'),
});

function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export async function GET(request: NextRequest) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const schoolId = searchParams.get('schoolId');
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const conditions = and(
    search ? like(profiles.email, `%${search}%`) : undefined,
    schoolId ? eq(profiles.schoolId, schoolId) : undefined,
    role ? eq(profiles.role, role) : undefined,
    status === 'active' ? eq(profiles.isActive, true) : undefined,
    status === 'inactive' ? eq(profiles.isActive, false) : undefined,
  );

  const [total] = await db
    .select({ count: count() })
    .from(profiles)
    .where(conditions);

  const userList = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      role: profiles.role,
      isActive: profiles.isActive,
      schoolId: profiles.schoolId,
      createdAt: profiles.createdAt,
      lastLoginAt: profiles.lastLoginAt,
    })
    .from(profiles)
    .where(conditions)
    .orderBy(desc(profiles.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return apiSuccess(userList, {
    page, pageSize,
    total: Number(total.count),
    totalPages: Math.ceil(Number(total.count) / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const { error: authError, user: adminUser } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { schoolId, email, firstName, lastName, phone, role } = parsed.data;

  const [existing] = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.email, email), eq(profiles.schoolId, schoolId)))
    .limit(1);
  if (existing) {
    return apiError(409, 'A user with this email already exists in this school');
  }

  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!school) return apiError(404, 'School not found');

  const tempPassword = randomBytes(8).toString('hex');
  const passwordHash = hashPassword(tempPassword);

  const [user] = await db.insert(profiles).values({
    schoolId,
    email,
    firstName,
    lastName,
    phone: phone || null,
    role,
    passwordHash,
    isActive: true,
  }).returning();

  await sendEmail({
    to: email,
    subject: `Welcome to EduNexus — ${school.name}`,
    html: welcomeAdminEmail({
      schoolName: school.name,
      schoolUrl: `https://${school.slug}.edunexus.com`,
      email,
      password: tempPassword,
      adminName: firstName,
    }),
  });

  await db.insert(auditLogs).values({
    schoolId,
    userId: adminUser!.id,
    action: 'user.created',
    tableName: 'profiles',
    recordId: user.id,
    newData: { email, firstName, lastName, role },
  });

  return apiSuccess({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
}
