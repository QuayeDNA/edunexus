import Link from 'next/link';
import { db } from '@/lib/db';
import { staff } from '@edunexus/database';
import { eq, and, isNull } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { notFound } from 'next/navigation';
import { EditStaffForm } from '@/components/admin/staff/edit-staff-form';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin', 'super_admin');
  const { id } = await params;

  const [staffMember] = await db.select()
    .from(staff)
    .where(and(eq(staff.id, id), eq(staff.schoolId, session.user.schoolId!), isNull(staff.deletedAt)))
    .limit(1);

  if (!staffMember) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/admin/staff/${id}`} className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2')}>
        <ArrowLeft className="h-4 w-4" /> Back to Staff
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Edit Staff</h1>
        <p className="text-sm text-muted-foreground">
          Update staff member details.
        </p>
      </div>
      <EditStaffForm staff={staffMember} />
    </div>
  );
}
