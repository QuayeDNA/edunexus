import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Users, UserCheck, UserX, Briefcase, SlidersHorizontal,
  Search, Download, X, Eye, Edit2, Trash2, Building2,
} from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useStaff, useDeleteStaff } from '../../../hooks/useStaff.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { formatDate, formatGHS } from '../../../utils/formatters.js';
import { STAFF_ROLES } from '../../../utils/constants.js';
import { cn } from '../../../utils/cn.js';

const ROLE_COLORS = {
  Teacher: 'bg-brand-50 text-brand-700',
  'Head Teacher': 'bg-purple-50 text-purple-700',
  Admin: 'bg-orange-50 text-orange-700',
  Accountant: 'bg-green-50 text-green-700',
  Librarian: 'bg-blue-50 text-blue-700',
  Counselor: 'bg-pink-50 text-pink-700',
  'Support Staff': 'bg-gray-100 text-gray-600',
};

export default function StaffPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();

  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useStaff({ schoolId, limit: 500 });
  const deleteStaff = useDeleteStaff();

  const staffList = data?.data ?? [];

  const departments = useMemo(() => {
    const depts = [...new Set(staffList.map(s => s.department).filter(Boolean))].sort();
    return depts;
  }, [staffList]);

  const filtered = useMemo(() => {
    let list = staffList;
    if (statusFilter !== 'All') list = list.filter(s => s.employment_status === statusFilter);
    if (roleFilter !== 'All') list = list.filter(s => s.role === roleFilter);
    if (deptFilter !== 'All') list = list.filter(s => s.department === deptFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        s.staff_id_number?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [staffList, statusFilter, roleFilter, deptFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: staffList.length,
    active: staffList.filter(s => s.employment_status === 'Active').length,
    onLeave: staffList.filter(s => s.employment_status === 'On Leave').length,
    teachers: staffList.filter(s => s.role === 'Teacher' || s.role === 'Head Teacher').length,
  }), [staffList]);

  const activeFiltersCount = [statusFilter, roleFilter, deptFilter].filter(f => f !== 'All').length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteStaff.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const clearFilters = () => {
    setStatusFilter('All');
    setRoleFilter('All');
    setDeptFilter('All');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle={`${stats.total} staff members · ${stats.active} active`}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="btn-primary text-sm" onClick={() => navigate('/admin/staff/new')}>
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Staff" value={isLoading ? null : stats.total} icon={Users} color="bg-brand-50 text-brand-600" loading={isLoading} onClick={() => setStatusFilter('All')} />
        <StatCard title="Active" value={isLoading ? null : stats.active} icon={UserCheck} color="bg-status-successBg text-status-success" loading={isLoading} onClick={() => setStatusFilter('Active')} />
        <StatCard title="On Leave" value={isLoading ? null : stats.onLeave} icon={UserX} color="bg-status-warningBg text-status-warning" loading={isLoading} onClick={() => setStatusFilter('On Leave')} />
        <StatCard title="Teaching Staff" value={isLoading ? null : stats.teachers} icon={Briefcase} color="bg-purple-50 text-purple-600" loading={isLoading} onClick={() => setRoleFilter('Teacher')} />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search staff..."
              className="input-base pl-9 h-9 text-sm w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-secondary h-9 px-3 text-xs gap-2', showFilters && 'bg-brand-50 border-brand-200 text-brand-700')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-brand-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFiltersCount}</span>
            )}
          </button>
          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="btn-ghost h-9 px-3 text-xs text-text-muted gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          <div className="ml-auto">
            <span className="text-xs text-text-muted">{filtered.length} records</span>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-surface-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Status:</span>
              <div className="flex gap-1">
                {['All', 'Active', 'On Leave', 'Terminated', 'Retired'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all', statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white border border-border text-text-secondary hover:border-brand-300')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Role:</span>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7">
                <option value="All">All Roles</option>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {departments.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-secondary">Dept:</span>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7">
                  <option value="All">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {['Staff Member', 'Role', 'Department', 'Email', 'Start Date', 'Salary', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-4 bg-surface-hover rounded" style={{ width: `${40 + (i + j * 11) % 50}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-10 h-10 text-text-muted" />
                      <div>
                        <p className="font-semibold text-text-primary">No staff found</p>
                        <p className="text-xs text-text-muted mt-1">{activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Add your first staff member'}</p>
                      </div>
                      {activeFiltersCount === 0 && (
                        <button onClick={() => navigate('/admin/staff/new')} className="btn-primary text-xs h-8 px-4">
                          <Plus className="w-3.5 h-3.5" /> Add Staff
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="hover:bg-surface-muted/40 transition-colors group/row">
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={s.photo_url} firstName={s.first_name} lastName={s.last_name} size="sm" />
                        <div className="min-w-0">
                          <Link to={`/admin/staff/${s.id}`} className="font-semibold text-text-primary hover:text-brand-600 transition-colors text-sm">
                            {s.first_name} {s.last_name}
                          </Link>
                          <p className="text-xs text-text-muted font-mono">{s.staff_id_number || '—'}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', ROLE_COLORS[s.role] || 'bg-surface-hover text-text-muted')}>
                        {s.role || '—'}
                      </span>
                    </td>
                    {/* Department */}
                    <td className="px-4 py-3">
                      {s.department ? (
                        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" />
                          {s.department}
                        </span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-sm text-text-secondary">{s.email || '—'}</td>
                    {/* Start Date */}
                    <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(s.start_date)}</td>
                    {/* Salary */}
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">{s.salary ? formatGHS(s.salary) : '—'}</td>
                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={s.employment_status || 'Active'} dot /></td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <Link to={`/admin/staff/${s.id}`} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Showing <span className="font-semibold text-text-primary">{filtered.length}</span> of <span className="font-semibold text-text-primary">{staffList.length}</span> staff</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteStaff.isPending}
        title={`Remove ${deleteTarget?.first_name} ${deleteTarget?.last_name}?`}
        message="This permanently removes the staff record. Employment history and payroll data will also be removed. This cannot be undone."
        confirmLabel="Remove Staff"
      />
    </div>
  );
}