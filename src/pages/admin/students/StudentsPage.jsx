import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import {
  GraduationCap, Plus, Users, UserCheck, UserX, Filter,
  Download, Upload, Search, ChevronDown, MoreHorizontal,
  Eye, Edit2, Trash2, Mail, Phone, X, SlidersHorizontal,
} from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useStudents, useDeleteStudent } from '../../../hooks/useStudents.js';
import { useClasses } from '../../../hooks/useClasses.js';
import DataTable from '../../../components/ui/DataTable.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { formatDate } from '../../../utils/formatters.js';
import { cn } from '../../../utils/cn.js';

const col = createColumnHelper();

const GENDER_COLORS = { Male: 'bg-blue-50 text-blue-700', Female: 'bg-pink-50 text-pink-700', Other: 'bg-purple-50 text-purple-700' };

export default function StudentsPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();

  const [statusFilter, setStatusFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useStudents({ schoolId, limit: 500 });
  const { data: classesData } = useClasses(schoolId);
  const deleteStudent = useDeleteStudent();

  const students = data?.data ?? [];
  const classes = classesData?.data ?? [];

  const filtered = useMemo(() => {
    let list = students;
    if (statusFilter !== 'All') list = list.filter(s => s.status === statusFilter);
    if (genderFilter !== 'All') list = list.filter(s => s.gender === genderFilter);
    if (classFilter !== 'All') list = list.filter(s => s.current_class_id === classFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        s.student_id_number?.toLowerCase().includes(q) ||
        s.classes?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, statusFilter, genderFilter, classFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter(s => s.status === 'Active').length,
    inactive: students.filter(s => s.status !== 'Active').length,
    male: students.filter(s => s.gender === 'Male').length,
    female: students.filter(s => s.gender === 'Female').length,
  }), [students]);

  const activeFiltersCount = [statusFilter, genderFilter, classFilter].filter(f => f !== 'All').length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteStudent.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const clearFilters = () => {
    setStatusFilter('All');
    setGenderFilter('All');
    setClassFilter('All');
    setSearchQuery('');
  };

  const columns = useMemo(() => [
    col.display({
      id: 'student',
      header: 'Student',
      size: 260,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar src={s.photo_url} firstName={s.first_name} lastName={s.last_name} size="sm" />
            <div className="min-w-0">
              <Link
                to={`/admin/students/${s.id}`}
                className="font-semibold text-text-primary hover:text-brand-600 transition-colors truncate block text-sm"
              >
                {s.first_name} {s.last_name}
                {s.other_names ? ` ${s.other_names}` : ''}
              </Link>
              <p className="text-xs text-text-muted font-mono">{s.student_id_number || '—'}</p>
            </div>
          </div>
        );
      },
    }),
    col.accessor(row => row.classes?.name || '—', {
      id: 'class',
      header: 'Class',
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-text-secondary">{getValue()}</span>
      ),
    }),
    col.accessor('gender', {
      header: 'Gender',
      size: 90,
      cell: ({ getValue }) => {
        const g = getValue();
        return g ? (
          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', GENDER_COLORS[g] ?? 'bg-surface-hover text-text-muted')}>{g}</span>
        ) : <span className="text-text-muted">—</span>;
      },
    }),
    col.accessor('date_of_birth', {
      header: 'Date of Birth',
      size: 120,
      cell: ({ getValue }) => <span className="text-sm text-text-secondary">{formatDate(getValue())}</span>,
    }),
    col.display({
      id: 'guardian',
      header: 'Guardian',
      size: 180,
      cell: ({ row }) => {
        const g = row.original.student_guardians?.[0]?.guardians;
        if (!g) return <span className="text-text-muted text-xs">No guardian</span>;
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{g.first_name} {g.last_name}</p>
            <p className="text-xs text-text-muted">{g.phone || '—'}</p>
          </div>
        );
      },
    }),
    col.accessor('admission_date', {
      header: 'Admitted',
      size: 110,
      cell: ({ getValue }) => <span className="text-sm text-text-secondary">{formatDate(getValue())}</span>,
    }),
    col.accessor('status', {
      header: 'Status',
      size: 100,
      cell: ({ getValue }) => <StatusBadge status={getValue() || 'Active'} dot />,
    }),
    col.display({
      id: 'actions',
      header: '',
      size: 60,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Link
              to={`/admin/students/${s.id}`}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors"
              title="View"
            >
              <Eye className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={`/admin/students/${s.id}/edit`}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setDeleteTarget(s)}
              className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    }),
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Students"
        subtitle={`${stats.total} enrolled · ${stats.active} active`}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm gap-2">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => navigate('/admin/students/new')}
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Students"
          value={isLoading ? null : stats.total.toLocaleString()}
          icon={GraduationCap}
          color="bg-brand-50 text-brand-600"
          loading={isLoading}
          onClick={() => setStatusFilter('All')}
        />
        <StatCard
          title="Active"
          value={isLoading ? null : stats.active.toLocaleString()}
          icon={UserCheck}
          color="bg-status-successBg text-status-success"
          loading={isLoading}
          onClick={() => setStatusFilter('Active')}
        />
        <StatCard
          title="Male"
          value={isLoading ? null : stats.male.toLocaleString()}
          icon={Users}
          color="bg-blue-50 text-blue-600"
          loading={isLoading}
          onClick={() => setGenderFilter('Male')}
        />
        <StatCard
          title="Female"
          value={isLoading ? null : stats.female.toLocaleString()}
          icon={Users}
          color="bg-pink-50 text-pink-600"
          loading={isLoading}
          onClick={() => setGenderFilter('Female')}
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="input-base pl-9 h-9 text-sm w-full"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-secondary h-9 px-3 text-xs gap-2', showFilters && 'bg-brand-50 border-brand-200 text-brand-700')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-brand-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="btn-ghost h-9 px-3 text-xs text-text-muted gap-1">
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-text-muted">{filtered.length} records</span>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted/50 border-b border-border flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Status:</span>
              <div className="flex gap-1">
                {['All', 'Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                      statusFilter === s
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-border text-text-secondary hover:border-brand-300'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Gender:</span>
              <div className="flex gap-1">
                {['All', 'Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                      genderFilter === g
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-border text-text-secondary hover:border-brand-300'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Class:</span>
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7"
              >
                <option value="All">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {columns.map(c => (
                  <th key={c.id} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                    {typeof c.header === 'string' ? c.header : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-surface-hover rounded" style={{ width: `${50 + (i * 13 + j * 7) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center">
                        <GraduationCap className="w-7 h-7 text-text-muted" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">No students found</p>
                        <p className="text-xs text-text-muted mt-1">
                          {activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Add your first student to get started'}
                        </p>
                      </div>
                      {activeFiltersCount === 0 && (
                        <button onClick={() => navigate('/admin/students/new')} className="btn-primary text-xs h-8 px-4 mt-1">
                          <Plus className="w-3.5 h-3.5" /> Add Student
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(student => (
                  <tr key={student.id} className="hover:bg-surface-muted/40 transition-colors group/row">
                    {columns.map(c => (
                      <td key={c.id} className="px-4 py-3 text-text-primary">
                        {c.cell ? c.cell({ row: { original: student }, getValue: () => student[c.accessorKey || c.id] }) : null}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>Showing <span className="font-semibold text-text-primary">{filtered.length}</span> of <span className="font-semibold text-text-primary">{students.length}</span> students</span>
            <button onClick={() => {}} className="btn-ghost h-8 px-3 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteStudent.isPending}
        title={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}?`}
        message="This will permanently remove all student records, grades, and attendance history. This action cannot be undone."
        confirmLabel="Delete Student"
      />
    </div>
  );
}