import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schools, auditLogs } from '@edunexus/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updateSchoolSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  address: z.string().optional(),
  region: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const [school] = await db.select().from(schools).where(eq(schools.id, params.id)).limit(1);
  if (!school) return apiError(404, 'School not found');

  return apiSuccess(school);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updateSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(schools).where(eq(schools.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'School not found');

  const [updated] = await db.update(schools)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schools.id, params.id))
    .returning();

  await db.insert(auditLogs).values({
    action: 'school.updated',
    tableName: 'schools',
    recordId: params.id,
    oldData: { isActive: existing.isActive },
    newData: parsed.data,
  });

  return apiSuccess(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const [existing] = await db.select().from(schools).where(eq(schools.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'School not found');

  await db.update(schools)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(schools.id, params.id));

  await db.insert(auditLogs).values({
    action: 'school.deleted',
    tableName: 'schools',
    recordId: params.id,
    oldData: { name: existing.name, slug: existing.slug },
  });

  return apiSuccess({ deleted: true });
}
