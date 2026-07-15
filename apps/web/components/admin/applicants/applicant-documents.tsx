'use client';

interface ApplicantDocumentsProps {
  birthCertificateFileId: string | null;
  priorReportCardFileId: string | null;
  photoFileId: string | null;
}

export function ApplicantDocuments({ birthCertificateFileId, priorReportCardFileId, photoFileId }: ApplicantDocumentsProps) {
  const docs = [
    { label: 'Birth Certificate', id: birthCertificateFileId },
    { label: 'Prior Report Card', id: priorReportCardFileId },
    { label: 'Applicant Photo', id: photoFileId },
  ].filter(d => d.id);

  if (docs.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Documents
        </h3>
        <p className="text-sm text-muted-foreground">No documents uploaded</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Documents
      </h3>
      <ul className="space-y-2">
        {docs.map(doc => (
          <li key={doc.id}>
            <a
              href={`/api/files/${doc.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-primary hover:underline"
            >
              <span>{doc.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
