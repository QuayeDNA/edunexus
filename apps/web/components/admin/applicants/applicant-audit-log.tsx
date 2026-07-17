'use client';

import { useEffect, useState } from 'react';
import type { ApplicantAuditEntry } from '@/types/applicant';

interface AuditLogProps {
  applicantId: string;
}

export function ApplicantAuditLog({ applicantId }: AuditLogProps) {
  const [entries, setEntries] = useState<ApplicantAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/audit-logs?tableName=applicants&recordId=${applicantId}`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => setEntries(data.data ?? []))
      .finally(() => setLoading(false));
  }, [applicantId]);

  if (loading) return null;

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Activity Log
        </h3>
        <p className="text-sm text-muted-foreground">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Activity Log
      </h3>
      <div className="space-y-3">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-start gap-3 text-sm">
            <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
            <div>
              <p className="font-medium">{entry.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString('en-GH')}
              </p>
              {entry.newData && typeof (entry.newData as Record<string, unknown>).status === 'string' && (
                <p className="text-xs text-muted-foreground">
                  Status → {String((entry.newData as Record<string, unknown>).status)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
