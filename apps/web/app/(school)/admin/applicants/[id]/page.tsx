import { db } from '@/lib/db';
import { applicants } from '@edunexus/database';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/auth.guard';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ApplicantDetailInfo } from '@/components/admin/applicants/applicant-detail-info';
import { ApplicantDocuments } from '@/components/admin/applicants/applicant-documents';
import { ApplicantActions } from '@/components/admin/applicants/applicant-actions';
import { ApplicantAuditLog } from '@/components/admin/applicants/applicant-audit-log';

export const dynamic = 'force-dynamic';

const statusBadge: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  waitlisted: 'bg-purple-100 text-purple-800',
};

const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
};

export default async function ApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('admin', 'super_admin');

  const [applicant] = await db.select()
    .from(applicants)
    .where(and(
      eq(applicants.id, id),
      eq(applicants.schoolId, session.user.schoolId!),
    ))
    .limit(1);

  if (!applicant) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/applicants" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {applicant.firstName} {applicant.lastName}
            </h1>
            <Badge className={statusBadge[applicant.status] ?? ''}>
              {statusLabel[applicant.status] ?? applicant.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Applied {new Date(applicant.createdAt).toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <ApplicantActions
        applicantId={applicant.id}
        status={applicant.status}
        gradeLevelId={applicant.gradeLevelId}
      />

      <ApplicantDocuments
        birthCertificateFileId={applicant.birthCertificateFileId}
        priorReportCardFileId={applicant.priorReportCardFileId}
        photoFileId={applicant.photoFileId}
      />

      <ApplicantDetailInfo
        applicant={{
          ...applicant,
          createdAt: applicant.createdAt.toISOString(),
          emergencyContacts: applicant.emergencyContacts as Array<{name: string; phone: string; relationship: string}> | null,
        }}
      />

      <ApplicantAuditLog applicantId={applicant.id} />
    </div>
  );
}
