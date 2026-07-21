import { requireRole } from '@/lib/auth/auth.guard';
import { AcademicManagementClient } from '@/components/admin/academics/academics-client';

export default async function AcademicsPage() {
  await requireRole('admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Academic Structure</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage academic years and terms
          </p>
        </div>
      </div>
      <AcademicManagementClient />
    </div>
  );
}
