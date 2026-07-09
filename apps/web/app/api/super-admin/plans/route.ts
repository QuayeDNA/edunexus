import { NextRequest } from 'next/server';
import { db } from '@edunexus/database';
import { schoolPlans } from '@edunexus/database/src/schema';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess, apiError } from '@/lib/api/response';

const createPlanSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  price: z.coerce.number().positive(),
  billingCycle: z.enum(['monthly', 'annual']),
  maxStudents: z.coerce.number().int().min(0).default(0),
  maxStaff: z.coerce.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
});

export async function GET() {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const plans = await db.select().from(schoolPlans).orderBy(desc(schoolPlans.createdAt));
  return apiSuccess(plans);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireRole('super_admin');
  if (authError) return authError;

  const body = await request.json();
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, 'Validation failed', parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [plan] = await db.insert(schoolPlans).values(parsed.data).returning();
  return apiSuccess(plan);
}
