import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schoolSubscriptions } from '@edunexus/database/src/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(['active', 'past_due', 'cancelled', 'expired']).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = updateSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [existing] = await db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.id, params.id)).limit(1);
  if (!existing) return apiError(404, 'Subscription not found');

  const [updated] = await db.update(schoolSubscriptions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schoolSubscriptions.id, params.id))
    .returning();

  return apiSuccess(updated);
}
