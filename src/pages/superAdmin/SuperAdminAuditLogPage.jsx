import { useState } from 'react';
import { AlertTriangle, Loader2, Search, ScrollText } from 'lucide-react';
import { useSuperAdminAuditEvents } from '../../hooks/useSuperAdmin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';

export default function SuperAdminAuditLogPage() {
  const [search, setSearch] = useState('');

  const auditQuery = useSuperAdminAuditEvents({
    search: search.trim() || undefined,
    limit: 100,
  });

  const events = auditQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Log"
        subtitle="Security and governance events across all schools"
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search audit events"
            className="input-base pl-9"
          />
        </label>
        <p className="text-xs text-text-muted">
          {auditQuery.data?.count ?? events.length} events
        </p>
      </div>

      {auditQuery.data?.pendingIntegration && (
        <div className="bg-status-warningBg border border-status-warning/30 rounded-xl p-4 text-sm text-status-warning">
          {auditQuery.data.integrationHint}
        </div>
      )}

      {auditQuery.isError && (
        <div className="bg-status-dangerBg border border-status-danger/30 rounded-xl p-4 text-sm text-status-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{auditQuery.error?.message ?? 'Failed to load audit log.'}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {auditQuery.isLoading ? (
          <div className="p-12 flex items-center justify-center text-text-muted gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading audit events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
              <ScrollText className="w-7 h-7 text-brand-600" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No audit events returned</h2>
            <p className="text-sm text-text-secondary max-w-xl mx-auto">
              Service-role handlers should write privileged activity records to the platform audit stream.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-text-secondary">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Actor</th>
                  <th className="text-left px-4 py-3 font-medium">Target</th>
                  <th className="text-left px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id ?? `${event.action}-${event.createdAt}`} className="border-t border-border">
                    <td className="px-4 py-3 text-text-primary font-medium">{event.action}</td>
                    <td className="px-4 py-3 text-text-secondary">{event.actorName}</td>
                    <td className="px-4 py-3 text-text-secondary">{event.targetName ?? '—'}</td>
                    <td className="px-4 py-3 text-text-secondary" title={event.createdAt ?? ''}>
                      {event.createdAt ? `${formatDate(event.createdAt)} (${formatRelativeTime(event.createdAt)})` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
