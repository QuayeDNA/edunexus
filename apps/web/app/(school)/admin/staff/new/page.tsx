import { requireRole } from '@/lib/auth/auth.guard';
import { CreateStaffForm } from '@/components/admin/staff/create-staff-form';

export const dynamic = 'force-dynamic';

export default async function NewStaffPage() {
  await requireRole('admin', 'super_admin');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add New Staff</h1>
        <p className="text-sm text-muted-foreground">
          Create a staff member and automatically generate their login profile.
        </p>
      </div>
      <CreateStaffForm />
    </div>
  );
}
