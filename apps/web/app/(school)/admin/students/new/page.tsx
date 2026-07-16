import { db } from '@/lib/db';
import { classes, gradeLevels } from '@edunexus/database';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { CreateStudentForm } from '@/components/admin/students/create-student-form';

export const dynamic = 'force-dynamic';

export default async function NewStudentPage() {
  const session = await requireRole('admin', 'super_admin');

  const allClasses = await db.select({
    id: classes.id,
    name: classes.name,
    code: classes.code,
    gradeLevelId: classes.gradeLevelId,
  })
    .from(classes)
    .where(eq(classes.schoolId, session.user.schoolId!))
    .orderBy(classes.name);

  const gradeList = await db.select({
    id: gradeLevels.id,
    name: gradeLevels.name,
    code: gradeLevels.code,
  })
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, session.user.schoolId!))
    .orderBy(gradeLevels.sortOrder);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add New Student</h1>
        <p className="text-sm text-muted-foreground">
          Create a student record directly without going through the applicant pipeline.
        </p>
      </div>
      <CreateStudentForm classes={allClasses} grades={gradeList} />
    </div>
  );
}
