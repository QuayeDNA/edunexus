'use client';

interface StudentDetail {
  id: string; firstName: string; lastName: string; otherNames: string | null;
  studentIdNumber: string; gender: string; dateOfBirth: string;
  placeOfBirth: string | null; nationality: string | null; religion: string | null;
  address: string | null; phone: string | null; email: string | null;
  bloodGroup: string | null; medicalNotes: string | null;
  enrollmentDate: string; status: string;
}

export function StudentDetailInfo({ student }: { student: StudentDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Personal Information
          </h3>
          <dl className="space-y-2 text-sm">
            <Row label="Full Name" value={`${student.firstName} ${student.lastName}${student.otherNames ? ` (${student.otherNames})` : ''}`} />
            <Row label="Date of Birth" value={new Date(student.dateOfBirth).toLocaleDateString('en-GH')} />
            <Row label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} />
            <Row label="Nationality" value={student.nationality} />
            <Row label="Religion" value={student.religion} />
            <Row label="Blood Group" value={student.bloodGroup} />
            <Row label="Place of Birth" value={student.placeOfBirth} />
          </dl>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Medical Notes
          </h3>
          <p className="text-sm">{student.medicalNotes || 'None recorded'}</p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contact Information
          </h3>
          <dl className="space-y-2 text-sm">
            <Row label="Phone" value={student.phone} />
            <Row label="Email" value={student.email} />
            <Row label="Address" value={student.address} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}
