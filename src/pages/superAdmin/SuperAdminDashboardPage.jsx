import { Building2, ShieldCheck, Users2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';

const STATS = [
  {
    label: 'Total Schools',
    value: '0',
    hint: 'Provisioned tenants',
    icon: Building2,
  },
  {
    label: 'Platform Admins',
    value: '0',
    hint: 'Cross-school operators',
    icon: ShieldCheck,
  },
  {
    label: 'Active Users',
    value: '0',
    hint: 'All schools combined',
    icon: Users2,
  },
];

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Cross-school visibility and governance overview"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATS.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-text-secondary">{label}</p>
              <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-1">{hint}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <h2 className="text-base font-semibold text-text-primary mb-2">Next implementation step</h2>
        <p className="text-sm text-text-secondary">
          Connect this dashboard to service-role Edge Functions for platform analytics.
          Keep all cross-school writes on backend-only execution paths.
        </p>
      </div>
    </div>
  );
}
