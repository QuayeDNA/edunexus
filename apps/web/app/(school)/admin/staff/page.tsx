import { db } from '@/lib/db';
import { staff } from '@edunexus/database';
import { eq, and, isNull } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StaffPageClient } from '@/components/admin/staff/staff-page-client';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const session = await requireRole('admin', 'super_admin');

  const staffList = session.user.schoolId
    ? await db.select().from(staff)
        .where(and(eq(staff.schoolId, session.user.schoolId), isNull(staff.deletedAt)))
        .orderBy(staff.lastName, staff.firstName)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader title="Staff" description="Manage staff members and employment contracts">
        <Link href="/admin/staff/new" className={cn(buttonVariants({ variant: 'default' }), 'inline-flex items-center')}>
          <Plus className="mr-2 h-4 w-4" /> Add Staff
        </Link>
      </PageHeader>
      <StaffPageClient initialData={staffList} />
    </div>
  );
}
