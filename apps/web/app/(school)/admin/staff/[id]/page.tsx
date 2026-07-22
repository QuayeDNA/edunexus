import { db } from '@/lib/db';
import { staff, employmentContracts } from '@edunexus/database';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { notFound } from 'next/navigation';
import { StaffDetail } from '@/components/admin/staff/staff-detail';

export const dynamic = 'force-dynamic';

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole('admin', 'super_admin');
  const { id } = await params;

  const [staffMember] = await db.select()
    .from(staff)
    .where(and(eq(staff.id, id), eq(staff.schoolId, session.user.schoolId!), isNull(staff.deletedAt)))
    .limit(1);

  if (!staffMember) notFound();

  const contracts = await db.select()
    .from(employmentContracts)
    .where(and(eq(employmentContracts.staffId, id), eq(employmentContracts.schoolId, session.user.schoolId!)))
    .orderBy(desc(employmentContracts.startDate));

  return <StaffDetail staff={staffMember} contracts={contracts} />;
}
