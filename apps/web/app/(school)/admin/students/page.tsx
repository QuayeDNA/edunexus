import { db } from '@/lib/db';
import { classes, gradeLevels } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudentTable } from '@/components/admin/students/student-table';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const session = await requireRole('admin', 'super_admin');

  const [classList, gradeList] = await Promise.all([
    session.user.schoolId
      ? db.select({ id: classes.id, name: classes.name, code: classes.code, gradeLevelId: classes.gradeLevelId })
          .from(classes)
          .where(eq(classes.schoolId, session.user.schoolId))
          .orderBy(classes.name)
      : Promise.resolve([]),
    session.user.schoolId
      ? db.select({ id: gradeLevels.id, name: gradeLevels.name, code: gradeLevels.code })
          .from(gradeLevels)
          .where(eq(gradeLevels.schoolId, session.user.schoolId))
          .orderBy(gradeLevels.sortOrder)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Students" description="Manage student records">
        <Link href="/admin/students/new" className={cn(buttonVariants({ variant: 'default' }), 'inline-flex items-center')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Link>
      </PageHeader>
      <StudentTable classes={classList} gradeLevels={gradeList} />
    </div>
  );
}
