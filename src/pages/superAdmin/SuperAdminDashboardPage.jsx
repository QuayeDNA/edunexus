import { AlertTriangle, Building2, Loader2, ShieldCheck, Users2 } from 'lucide-react';
import { useSuperAdminDashboardSummary } from '../../hooks/useSuperAdmin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatRelativeTime } from '../../utils/formatters.js';

export default function SuperAdminDashboardPage() {
  const dashboardQuery = useSuperAdminDashboardSummary();

  const totals = dashboardQuery.data?.totals ?? {
    schools: 0,
    platformAdmins: 0,
    activeUsers: 0,
  };

  const stats = [
    {
      label: 'Total Schools',
      value: totals.schools,
      hint: 'Provisioned tenants',
      icon: Building2,
    },
    {
      label: 'Platform Admins',
      value: totals.platformAdmins,
      hint: 'Cross-school operators',
      icon: ShieldCheck,
    },
    {
      label: 'Active Users',
      value: totals.activeUsers,
      hint: 'All schools combined',
      icon: Users2,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Cross-school visibility and governance overview"
      />

      {dashboardQuery.data?.pendingIntegration && (
        <div className="bg-status-warningBg border border-status-warning/30 rounded-xl p-4 text-sm text-status-warning">
          {dashboardQuery.data.integrationHint}
        </div>
      )}

      {dashboardQuery.isError && (
        <div className="bg-status-dangerBg border border-status-danger/30 rounded-xl p-4 text-sm text-status-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{dashboardQuery.error?.message ?? 'Failed to load platform summary.'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-text-secondary">{label}</p>
              <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary">
              {dashboardQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin text-brand-600" /> : value}
            </p>
            <p className="text-xs text-text-muted mt-1">{hint}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <h2 className="text-base font-semibold text-text-primary mb-2">Next implementation step</h2>
        <p className="text-sm text-text-secondary">
          Platform summary now reads from the `super-admin-ops` Edge Function contract.
          Keep all cross-school writes on backend-only execution paths.
        </p>
        <p className="text-xs text-text-muted mt-2">
          Last refresh: {dashboardQuery.data?.generatedAt ? formatRelativeTime(dashboardQuery.data.generatedAt) : 'Not available'}
        </p>
      </div>
    </div>
  );
}
