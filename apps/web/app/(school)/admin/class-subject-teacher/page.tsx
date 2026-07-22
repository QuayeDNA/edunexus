import { db } from '@/lib/db'
import { gradeLevels, academicYears } from '@edunexus/database'
import { eq, and } from 'drizzle-orm'
import { requireRole } from '@/lib/auth/auth.guard'
import { MatrixClient } from '@/components/admin/class-subject-teacher/matrix-client'
import { PageHeader } from '@/components/page-header'

export const dynamic = 'force-dynamic'

export default async function ClassSubjectTeacherPage() {
  const session = await requireRole('admin', 'super_admin')

  const gradeLevelList = await db.select({ id: gradeLevels.id, name: gradeLevels.name, code: gradeLevels.code })
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, session.user.schoolId!))
    .orderBy(gradeLevels.sortOrder)

  const [currentYear] = await db.select({ id: academicYears.id })
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, session.user.schoolId!), eq(academicYears.isCurrent, true)))
    .limit(1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class-Subject-Teacher Assignment"
        description="Assign teachers to subjects across classes in a grade level"
      />
      <MatrixClient gradeLevels={gradeLevelList} defaultAcademicYearId={currentYear?.id ?? ''} />
    </div>
  )
}
