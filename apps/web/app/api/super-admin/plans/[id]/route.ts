import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { schoolPlans } from '@edunexus/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updatePlanSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(500).optional(),
  price: z.coerce.number().positive().optional(),
  maxStudents: z.coerce.number().int().min(0).optional(),
  maxStaff: z.coerce.number().int().min(0).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(schoolPlans).where(eq(schoolPlans.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'Plan not found');

  const updateData = { ...parsed.data, updatedAt: new Date() } as Record<string, unknown>;
  if (updateData.price !== undefined) updateData.price = String(updateData.price);

  const [updated] = await db.update(schoolPlans)
    .set(updateData)
    .where(eq(schoolPlans.id, params.id))
    .returning();

  return apiSuccess(updated);
}
