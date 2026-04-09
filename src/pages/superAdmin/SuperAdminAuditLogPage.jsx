import { Construction, ScrollText } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';

export default function SuperAdminAuditLogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Log"
        subtitle="Security and governance events across all schools"
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-12 text-center">
        <div className="w-14 h-14 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
          <ScrollText className="w-7 h-7 text-brand-600" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Audit stream placeholder</h2>
        <p className="text-sm text-text-secondary max-w-xl mx-auto mb-5">
          Capture role changes, school lifecycle actions, and privileged operations from backend service-role handlers.
          Audit events should include actor, target, action, and timestamp metadata.
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-surface-muted border border-border text-text-muted">
          <Construction className="w-3.5 h-3.5" />
          Pending service-role integration
        </div>
      </div>
    </div>
  );
}
