import { AlertTriangle, Building2, Loader2, RefreshCw, ScrollText, ShieldCheck, Users2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSuperAdminAuditEvents, useSuperAdminDashboardSummary } from '../../hooks/useSuperAdmin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';

export default function SuperAdminDashboardPage() {
  const dashboardQuery = useSuperAdminDashboardSummary();
  const auditQuery = useSuperAdminAuditEvents({ limit: 5 });

  const totals = dashboardQuery.data?.totals ?? {
    schools: 0,
    platformAdmins: 0,
    activeUsers: 0,
  };

  const recentEvents = auditQuery.data?.items ?? [];

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
      <div className="flex items-center justify-between">
        <PageHeader
          title="Super Admin Dashboard"
          subtitle="Cross-school visibility and governance overview"
        />
        <button
          type="button"
          onClick={() => {
            dashboardQuery.refetch();
            auditQuery.refetch();
          }}
          disabled={dashboardQuery.isRefetching || auditQuery.isRefetching}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${dashboardQuery.isRefetching || auditQuery.isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/super-admin/schools"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-surface-muted transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Manage Schools</p>
              <p className="text-xs text-text-muted">Create and provision new schools</p>
            </div>
          </Link>
          <Link
            to="/super-admin/users"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-surface-muted transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Users2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Manage Users</p>
              <p className="text-xs text-text-muted">Invite and manage platform users</p>
            </div>
          </Link>
          <Link
            to="/super-admin/audit-log"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-surface-muted transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">View Audit Log</p>
              <p className="text-xs text-text-muted">Monitor platform activity</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface-muted">
            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">System Health</p>
              <p className="text-xs text-text-muted">All systems operational</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Recent Activity</h2>
          <Link
            to="/super-admin/audit-log"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            View all →
          </Link>
        </div>
        {auditQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-text-muted gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading recent activity...
          </div>
        ) : recentEvents.length === 0 ? (
          <div className="text-center py-8">
            <ScrollText className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div key={event.id ?? `${event.action}-${event.createdAt}`} className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted">
                <div className="w-2 h-2 rounded-full bg-brand-600 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{event.action}</p>
                  <p className="text-xs text-text-secondary">
                    by {event.actorName}
                    {event.targetName && ` • ${event.targetName}`}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {event.createdAt ? formatRelativeTime(event.createdAt) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
