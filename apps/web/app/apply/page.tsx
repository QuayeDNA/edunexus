import { db } from '@/lib/db';
import { gradeLevels, schools } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { ApplicationForm } from '@/components/apply/application-form';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

export default async function ApplyPage(props: { searchParams?: Promise<{ school?: string }> }) {
  const searchParams = await props.searchParams;
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  let tenant = await resolveTenant(host);

  if (!tenant.schoolId && searchParams?.school) {
    const [row] = await db.select({ id: schools.id, name: schools.name, slug: schools.slug })
      .from(schools)
      .where(eq(schools.slug, searchParams.school))
      .limit(1);
    if (row) {
      tenant = { schoolId: row.id, slug: row.slug, name: row.name, isSuperAdmin: false };
    }
  }

  if (!tenant.schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">School not found. Please check the URL.</p>
      </div>
    );
  }

  const grades = await db.select()
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, tenant.schoolId))
    .orderBy(gradeLevels.sortOrder);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Apply to {tenant.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete the form below to submit your child&apos;s application to {tenant.name}.
          </p>
        </div>
        <ApplicationForm grades={grades} schoolName={tenant.name ?? undefined} schoolId={tenant.schoolId} />
      </div>
    </div>
  );
}
