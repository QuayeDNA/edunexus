import { db } from '@/lib/db';
import { schoolSubscriptions, schools, schoolPlans } from '@edunexus/database/src/schema';
import { desc, eq } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';

export async function GET() {
  const { error } = await requireRole('super_admin');
  if (error) return error;

  const subscriptions = await db
    .select({
      id: schoolSubscriptions.id,
      schoolId: schoolSubscriptions.schoolId,
      planId: schoolSubscriptions.planId,
      status: schoolSubscriptions.status,
      startedAt: schoolSubscriptions.startedAt,
      nextBillingAt: schoolSubscriptions.nextBillingAt,
      schoolName: schools.name,
      planName: schoolPlans.name,
      planPrice: schoolPlans.price,
    })
    .from(schoolSubscriptions)
    .leftJoin(schools, eq(schoolSubscriptions.schoolId, schools.id))
    .leftJoin(schoolPlans, eq(schoolSubscriptions.planId, schoolPlans.id))
    .orderBy(desc(schoolSubscriptions.createdAt));

  return apiSuccess(subscriptions);
}
