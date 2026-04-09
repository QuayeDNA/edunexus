import { Construction, UserCog } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';

export default function SuperAdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-School Users"
        subtitle="Manage platform operators and school-level user lifecycles"
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-12 text-center">
        <div className="w-14 h-14 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
          <UserCog className="w-7 h-7 text-brand-600" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Cross-school user operations are ready for wiring</h2>
        <p className="text-sm text-text-secondary max-w-xl mx-auto mb-5">
          Implement invite, role elevation, deactivation, and reactivation through service-role Edge Functions.
          School-level settings must not create or promote super_admin users.
        </p>
        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-surface-muted border border-border text-text-muted">
          <Construction className="w-3.5 h-3.5" />
          Pending service-role integration
        </div>
      </div>
    </div>
  );
}
