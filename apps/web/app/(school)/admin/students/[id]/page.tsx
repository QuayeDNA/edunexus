import { db } from '@/lib/db';
import { students, enrollments, classes, academicYears, studentGuardians, guardians } from '@edunexus/database';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StudentDetailInfo } from '@/components/admin/students/student-detail-info';
import { StudentGuardians } from '@/components/admin/students/student-guardians';
import { StudentEnrollments } from '@/components/admin/students/student-enrollments';
import { StudentAuditLog } from '@/components/admin/students/student-audit-log';

export const dynamic = 'force-dynamic';

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-800', withdrawn: 'bg-red-100 text-red-800',
  transferred_out: 'bg-orange-100 text-orange-800', graduated: 'bg-blue-100 text-blue-800',
};
const statusLabel: Record<string, string> = {
  active: 'Active', withdrawn: 'Withdrawn',
  transferred_out: 'Transferred', graduated: 'Graduated',
};

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('admin', 'super_admin');

  const [student] = await db.select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.schoolId, session.user.schoolId!)))
    .limit(1);
  if (!student) notFound();

  const enrollmentRows = await db.select({
    id: enrollments.id, className: classes.name,
    academicYearName: academicYears.name, status: enrollments.status,
    enrollmentDate: enrollments.enrollmentDate, endDate: enrollments.endDate,
  }).from(enrollments)
    .leftJoin(classes, eq(classes.id, enrollments.classId))
    .leftJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
    .where(and(eq(enrollments.studentId, id), eq(enrollments.schoolId, session.user.schoolId!)))
    .orderBy(desc(enrollments.enrollmentDate));

  const guardianRows = await db.select({
    id: guardians.id, firstName: guardians.firstName,
    lastName: guardians.lastName, relationship: studentGuardians.relationship,
    phone: guardians.phone, email: guardians.email,
    occupation: guardians.occupation,     isPrimary: guardians.isPrimary,
  }).from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(eq(studentGuardians.studentId, id));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/students"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Link>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{student.firstName} {student.lastName}</h1>
            <Badge className={statusBadge[student.status] ?? ''}>
              {statusLabel[student.status] ?? student.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ID: {student.studentIdNumber} · Enrolled {new Date(student.enrollmentDate).toLocaleDateString('en-GH', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link href={`/admin/students/${id}/edit`} className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex items-center')}>
          <Pencil className="mr-2 h-4 w-4" /> Edit Profile
        </Link>
      </div>
      <StudentDetailInfo student={student} />
      <StudentGuardians guardians={guardianRows} />
      <StudentEnrollments enrollments={enrollmentRows} />
      <StudentAuditLog studentId={id} />
    </div>
  );
}
