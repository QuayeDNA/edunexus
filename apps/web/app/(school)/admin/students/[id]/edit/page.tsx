import { db } from "@/lib/db";
import { students } from "@edunexus/database";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth/auth.guard";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditStudentForm } from "@/components/admin/students/edit-student-form";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("admin", "super_admin");

  const [student] = await db
    .select()
    .from(students)
    .where(
      and(eq(students.id, id), eq(students.schoolId, session.user.schoolId!)),
    )
    .limit(1);
  if (!student) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/students/${id}`}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Student
        </Link>
      </div>
      <EditStudentForm
        student={{
          ...student,
          dateOfBirth: student.dateOfBirth,
        }}
      />
    </div>
  );
}
