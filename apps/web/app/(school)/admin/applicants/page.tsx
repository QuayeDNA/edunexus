import { db } from '@/lib/db';
import { gradeLevels } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { ApplicantTable } from '@/components/admin/applicants/applicant-table';

export const dynamic = 'force-dynamic';

export default async function ApplicantsPage() {
  const session = await requireRole('admin', 'super_admin');
  const schoolGrades = session.user.schoolId
    ? await db.select()
        .from(gradeLevels)
        .where(eq(gradeLevels.schoolId, session.user.schoolId))
        .orderBy(gradeLevels.sortOrder)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admissions Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review, filter, and process applicant submissions
        </p>
      </div>
      <ApplicantTable gradeLevels={schoolGrades} />
    </div>
  );
}
