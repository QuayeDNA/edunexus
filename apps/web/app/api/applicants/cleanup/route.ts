import { db } from '@/lib/db/client';
import { applicants } from '@edunexus/database';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { requireRole } from '@/lib/api/require-role';
import { apiSuccess } from '@/lib/api/response';
import { anonymizeApplicant } from '@/services/anonymize';

export async function POST() {
  const { error: authError } = await requireRole('admin', 'super_admin');
  if (authError) return authError;

  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

  const expired = await db
    .select({ id: applicants.id })
    .from(applicants)
    .where(and(
      eq(applicants.status, 'rejected'),
      isNull(applicants.anonymizedAt),
      lt(applicants.createdAt, sixMonthsAgo),
    ))
    .limit(100);

  for (const record of expired) {
    await anonymizeApplicant(db, record.id);
  }

  return apiSuccess({ anonymized: expired.length });
}
