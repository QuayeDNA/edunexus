'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuditEntry } from '@/types/students';

export function StudentAuditLog({ studentId }: { studentId: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/audit-logs?tableName=students&recordId=${studentId}&limit=10`)
      .then(r => r.json())
      .then(d => setEntries(d.data ?? []))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Activity Log
      </h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(e => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="font-medium capitalize">{e.action.toLowerCase()}</span>
              <span className="text-muted-foreground">
                {new Date(e.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
