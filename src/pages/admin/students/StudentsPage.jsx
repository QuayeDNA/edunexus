import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { GraduationCap, Plus, Users, UserCheck } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useStudents } from '../../../hooks/useStudents.js';
import DataTable from '../../../components/ui/DataTable.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import { formatDate } from '../../../utils/formatters.js';

const col = createColumnHelper();

export default function StudentsPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const [statusFilter, setStatusFilter] = useState('All');

  const { data, isLoading } = useStudents({ schoolId, limit: 200 });
  const students = data?.data ?? [];

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return students;
    return students.filter((s) => s.status === statusFilter);
  }, [students, statusFilter]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === 'Active').length;
    const inactive = students.filter((s) => s.status !== 'Active').length;
    return { total, active, inactive };
  }, [students]);

  const columns = useMemo(() => [
    col.display({
      id: 'student',
      header: 'Student',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Link to={`/admin/students/${s.id}`} className="flex items-center gap-3 group">
            <Avatar src={s.photo_url} firstName={s.first_name} lastName={s.last_name} size="sm" />
            <div>
              <p className="font-medium text-text-primary group-hover:text-brand-700">
                {s.first_name} {s.last_name}
              </p>
              <p className="text-xs text-text-muted">{s.student_id_number || 'No student ID'}</p>
            </div>
          </Link>
        );
      },
    }),
    col.accessor((row) => row.classes?.name || '-', {
      id: 'class',
      header: 'Class',
    }),
    col.display({
      id: 'guardian',
      header: 'Guardian',
      cell: ({ row }) => {
        const guardian = row.original.student_guardians?.[0]?.guardians;
        if (!guardian) return <span className="text-text-muted">-</span>;
        return (
          <div>
            <p>{guardian.first_name} {guardian.last_name}</p>
            <p className="text-xs text-text-muted">{guardian.phone || '-'}</p>
          </div>
        );
      },
    }),
    col.accessor('admission_date', {
      header: 'Admitted',
      cell: ({ getValue }) => formatDate(getValue()),
    }),
    col.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    }),
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${stats.total} enrolled students`}
        actions={
          <button className="btn-primary" onClick={() => navigate('/admin/students/new')}>
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Students" value={stats.total} icon={GraduationCap} color="bg-brand-50 text-brand-600" loading={isLoading} />
        <StatCard title="Active" value={stats.active} icon={UserCheck} color="bg-status-successBg text-status-success" loading={isLoading} />
        <StatCard title="Inactive" value={stats.inactive} icon={Users} color="bg-surface-hover text-text-secondary" loading={isLoading} />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          exportFileName="students"
          emptyTitle="No students found"
          emptyMessage="Add your first student to begin enrollment tracking."
          emptyAction={{ label: 'Add Student', onClick: () => navigate('/admin/students/new') }}
          toolbar={
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs border border-border rounded-md px-2.5 bg-white text-text-primary"
              aria-label="Filter students by status"
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
              <option value="Transferred">Transferred</option>
              <option value="Suspended">Suspended</option>
            </select>
          }
        />
      </div>
    </div>
  );
}
