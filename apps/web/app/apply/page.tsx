import { db } from '@/lib/db';
import { gradeLevels } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { ApplicationForm } from '@/components/apply/application-form';

export const dynamic = 'force-dynamic';

export default async function ApplyPage() {
  const headersList = await headers();
  const schoolId = headersList.get('x-tenant-id');

  if (!schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">School not found. Please check the URL.</p>
      </div>
    );
  }

  const grades = await db.select()
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, schoolId))
    .orderBy(gradeLevels.sortOrder);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Apply for Admission</h1>
          <p className="mt-2 text-muted-foreground">
            Complete the form below to submit your child&apos;s application.
          </p>
        </div>
        <ApplicationForm grades={grades} />
      </div>
    </div>
  );
}
