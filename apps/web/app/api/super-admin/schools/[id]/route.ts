import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { schools, auditLogs } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { routeHandler } from '@/lib/api/handler';
import { NotFoundError, ValidationError } from '@/lib/api/errors';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';

const updateSchoolSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  region: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

export const GET = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const [school] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  if (!school) throw new NotFoundError('School');

  return apiSuccess(school);
});

export const PATCH = routeHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;
  const { error: authError, user } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updateSchoolSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  if (!existing) throw new NotFoundError('School');

  const [updated] = await db.update(schools)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schools.id, id))
    .returning();

  await db.insert(auditLogs).values({
    schoolId: existing.id,
    userId: user!.id,
    action: 'school.updated',
    tableName: 'schools',
    recordId: id,
    oldData: { isActive: existing.isActive },
    newData: parsed.data,
  });

  return apiSuccess(updated);
});

export const DELETE = routeHandler(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;
  const { error: authError, user } = await requireRole('super_admin');
  if (authError) return authError;

  const [existing] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  if (!existing) throw new NotFoundError('School');

  await db.update(schools)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(schools.id, id));

  await db.insert(auditLogs).values({
    schoolId: existing.id,
    userId: user!.id,
    action: 'school.deleted',
    tableName: 'schools',
    recordId: id,
    oldData: { name: existing.name, slug: existing.slug },
  });

  return apiSuccess({ deleted: true });
});
