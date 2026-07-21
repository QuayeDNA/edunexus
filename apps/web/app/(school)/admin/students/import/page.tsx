import { requireRole } from "@/lib/auth/auth.guard";
import { StudentImportWizard } from "@/components/admin/students/student-import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportStudentsPage() {
  await requireRole("admin", "super_admin");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Students</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to bulk-add students. Preview, map columns,
          validate, then import.
        </p>
      </div>
      <StudentImportWizard />
    </div>
  );
}
