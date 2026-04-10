import { useState } from 'react';
import { AlertTriangle, Building2, Loader2, Search } from 'lucide-react';
import {
  useCreatePlatformSchool,
  useSetPlatformSchoolStatus,
  useSuperAdminSchools,
} from '../../hooks/useSuperAdmin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';

const STATUS_STYLES = {
  active: 'bg-status-successBg text-status-success',
  suspended: 'bg-status-dangerBg text-status-danger',
  inactive: 'bg-surface-muted text-text-muted',
};

export default function SuperAdminSchoolsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [schoolsCursor, setSchoolsCursor] = useState(null);
  const [createSchoolForm, setCreateSchoolForm] = useState({
    name: '',
    country: 'GH',
    email: '',
  });

  const createSchoolMutation = useCreatePlatformSchool();
  const setSchoolStatusMutation = useSetPlatformSchoolStatus();

  const schoolsQuery = useSuperAdminSchools({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    limit: 50,
    cursor: schoolsCursor,
  });

  const schools = schoolsQuery.data?.items ?? [];

  const handleCreateSchool = async (event) => {
    event.preventDefault();

    const name = createSchoolForm.name.trim();
    if (!name) return;

    await createSchoolMutation.mutateAsync({
      name,
      country: createSchoolForm.country.trim() || 'GH',
      email: createSchoolForm.email.trim() || null,
    });

    setCreateSchoolForm((prev) => ({
      ...prev,
      name: '',
      email: '',
    }));
  };

  const handleToggleSchoolStatus = async (school) => {
    if (!school?.id) return;

    const current = String(school.status ?? 'active').toLowerCase();
    const nextStatus = current === 'suspended' ? 'active' : 'suspended';

    await setSchoolStatusMutation.mutateAsync({
      schoolId: school.id,
      status: nextStatus,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Provisioning"
        subtitle="Create, suspend, reactivate, and review tenant schools"
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={handleCreateSchool}>
          <input
            value={createSchoolForm.name}
            onChange={(event) => setCreateSchoolForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="School name"
            className="input-base md:col-span-2"
            required
          />
          <input
            value={createSchoolForm.country}
            onChange={(event) => setCreateSchoolForm((prev) => ({ ...prev, country: event.target.value }))}
            placeholder="Country code"
            className="input-base"
          />
          <input
            value={createSchoolForm.email}
            onChange={(event) => setCreateSchoolForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="School email (optional)"
            className="input-base"
            type="email"
          />
          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={createSchoolMutation.isPending || !createSchoolForm.name.trim()}
            >
              {createSchoolMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create School
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          <label className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSchoolsCursor(null);
              }}
              placeholder="Search schools"
              className="input-base pl-9"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setSchoolsCursor(null);
            }}
            className="input-base sm:w-40"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setSchoolsCursor(null);
              }}
              className="btn-secondary text-xs whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-muted">
            {schoolsQuery.data?.count ?? schools.length} schools
          </p>
          {schoolsCursor && (
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setSchoolsCursor(null)}
              disabled={schoolsQuery.isLoading}
            >
              First page
            </button>
          )}
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setSchoolsCursor(schoolsQuery.data?.nextCursor ?? null)}
            disabled={!schoolsQuery.data?.nextCursor || schoolsQuery.isLoading}
          >
            Next page
          </button>
        </div>
      </div>

      {schoolsQuery.data?.pendingIntegration && (
        <div className="bg-status-warningBg border border-status-warning/30 rounded-xl p-4 text-sm text-status-warning">
          {schoolsQuery.data.integrationHint}
        </div>
      )}

      {schoolsQuery.isError && (
        <div className="bg-status-dangerBg border border-status-danger/30 rounded-xl p-4 text-sm text-status-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{schoolsQuery.error?.message ?? 'Failed to load schools.'}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {schoolsQuery.isLoading ? (
          <div className="p-12 flex items-center justify-center text-text-muted gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading schools...
          </div>
        ) : schools.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-brand-600" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No schools returned</h2>
            <p className="text-sm text-text-secondary max-w-xl mx-auto">
              Once the service-role backend is active, provisioned tenant schools will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-text-secondary">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">School</th>
                  <th className="text-left px-4 py-3 font-medium">Region</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Active Users</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => {
                  const statusKey = String(school.status ?? 'active').toLowerCase();
                  const isSuspended = statusKey === 'suspended';
                  return (
                    <tr key={school.id ?? school.name} className="border-t border-border">
                      <td className="px-4 py-3 text-text-primary font-medium">{school.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{school.region ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${STATUS_STYLES[statusKey] ?? STATUS_STYLES.inactive}`}>
                          {school.status ?? 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{school.activeUsers}</td>
                      <td className="px-4 py-3 text-text-secondary" title={school.createdAt ?? ''}>
                        {school.createdAt ? `${formatDate(school.createdAt)} (${formatRelativeTime(school.createdAt)})` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={setSchoolStatusMutation.isPending || !school.id}
                          onClick={() => handleToggleSchoolStatus(school)}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
