import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { profiles, auditLogs } from '@edunexus/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['admin', 'teacher', 'student', 'parent']).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(profiles).where(eq(profiles.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'User not found');

  if (existing.role === 'super_admin') {
    return apiError(403, 'Cannot modify super admin users');
  }

  const [updated] = await db.update(profiles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profiles.id, params.id))
    .returning();

  await db.insert(auditLogs).values({
    action: 'user.updated',
    tableName: 'profiles',
    recordId: params.id,
    oldData: { isActive: existing.isActive, role: existing.role },
    newData: parsed.data,
  });

  return apiSuccess(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const [existing] = await db.select().from(profiles).where(eq(profiles.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'User not found');
  if (existing.role === 'super_admin') return apiError(403, 'Cannot delete super admin users');

  await db.update(profiles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(profiles.id, params.id));

  await db.insert(auditLogs).values({
    action: 'user.deleted',
    tableName: 'profiles',
    recordId: params.id,
    oldData: { email: existing.email },
  });

  return apiSuccess({ deleted: true });
}
