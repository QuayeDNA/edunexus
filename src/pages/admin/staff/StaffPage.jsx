import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, UserCheck, Users, UserX } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useStaff } from '../../../hooks/useStaff.js';
import DataTable from '../../../components/ui/DataTable.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import { formatDate } from '../../../utils/formatters.js';

const col = createColumnHelper();

export default function StaffPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const [statusFilter, setStatusFilter] = useState('All');

  const { data, isLoading } = useStaff({ schoolId, limit: 200 });
  const staff = data?.data ?? [];

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return staff;
    return staff.filter((s) => s.employment_status === statusFilter);
  }, [staff, statusFilter]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.employment_status === 'Active').length;
    const onLeave = staff.filter((s) => s.employment_status === 'On Leave').length;
    return { total, active, onLeave };
  }, [staff]);

  const columns = useMemo(() => [
    col.display({
      id: 'name',
      header: 'Staff',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Link to={`/admin/staff/${s.id}`} className="flex items-center gap-3 group">
            <Avatar src={s.photo_url} firstName={s.first_name} lastName={s.last_name} size="sm" />
            <div>
              <p className="font-medium text-text-primary group-hover:text-brand-700">
                {s.first_name} {s.last_name}
              </p>
              <p className="text-xs text-text-muted">{s.staff_id_number || 'No staff ID'}</p>
            </div>
          </Link>
        );
      },
    }),
    col.accessor('role', { header: 'Role' }),
    col.accessor('department', {
      header: 'Department',
      cell: ({ getValue }) => getValue() || '-',
    }),
    col.accessor('start_date', {
      header: 'Start Date',
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    col.accessor('employment_status', {
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() || 'Inactive'} />,
    }),
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle={`${stats.total} staff members`}
        actions={
          <button className="btn-primary" onClick={() => navigate('/admin/staff/new')}>
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Staff" value={stats.total} icon={Users} color="bg-brand-50 text-brand-600" loading={isLoading} />
        <StatCard title="Active" value={stats.active} icon={UserCheck} color="bg-status-successBg text-status-success" loading={isLoading} />
        <StatCard title="On Leave" value={stats.onLeave} icon={UserX} color="bg-status-warningBg text-status-warning" loading={isLoading} />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          exportFileName="staff"
          emptyTitle="No staff records found"
          emptyMessage="Add your first staff member to continue setup."
          emptyAction={{ label: 'Add Staff', onClick: () => navigate('/admin/staff/new') }}
          toolbar={
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs border border-border rounded-md px-2.5 bg-white text-text-primary"
              aria-label="Filter staff by status"
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
              <option value="Retired">Retired</option>
            </select>
          }
        />
      </div>
    </div>
  );
}
