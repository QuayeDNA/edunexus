import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, School2, UserCheck, Building2, Users, Search, SlidersHorizontal,
  X, Eye, Trash2,
} from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useAcademicYears } from '../../../hooks/useSchool.js';
import { useClasses, useDeleteClass } from '../../../hooks/useClasses.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { cn } from '../../../utils/cn.js';

function getTeacherName(profile) {
  if (!profile) return null;
  if (profile.full_name) return profile.full_name;
  const first = profile.first_name || '';
  const last = profile.last_name || '';
  const name = `${first} ${last}`.trim();
  return name || null;
}

export default function ClassesPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [teacherFilter, setTeacherFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useClasses(schoolId);
  const { data: yearsData } = useAcademicYears(schoolId);
  const deleteClass = useDeleteClass();

  const classList = data?.data ?? [];
  const academicYears = yearsData?.data ?? [];

  const gradeOptions = useMemo(
    () => [...new Set(classList.map(c => c.grade_levels?.name).filter(Boolean))],
    [classList]
  );

  const filtered = useMemo(() => {
    let list = classList;
    if (yearFilter !== 'All') list = list.filter(c => c.academic_year_id === yearFilter);
    if (gradeFilter !== 'All') list = list.filter(c => c.grade_levels?.name === gradeFilter);
    if (teacherFilter === 'Assigned') list = list.filter(c => !!c.class_teacher_id);
    if (teacherFilter === 'Unassigned') list = list.filter(c => !c.class_teacher_id);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => {
        const teacher = getTeacherName(c.profiles)?.toLowerCase() || '';
        return (
          c.name?.toLowerCase().includes(q) ||
          c.grade_levels?.name?.toLowerCase().includes(q) ||
          c.room?.toLowerCase().includes(q) ||
          teacher.includes(q)
        );
      });
    }
    return list;
  }, [classList, yearFilter, gradeFilter, teacherFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: classList.length,
    assignedTeacher: classList.filter(c => !!c.class_teacher_id).length,
    withRoom: classList.filter(c => !!c.room).length,
    withCapacity: classList.filter(c => Number(c.capacity || 0) > 0).length,
  }), [classList]);

  const activeFiltersCount = [yearFilter, gradeFilter, teacherFilter].filter(f => f !== 'All').length;

  const clearFilters = () => {
    setSearchQuery('');
    setYearFilter('All');
    setGradeFilter('All');
    setTeacherFilter('All');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteClass.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle={`${stats.total} classes configured`}
        actions={
          <button className="btn-primary text-sm" onClick={() => navigate('/admin/classes/new')}>
            <Plus className="w-4 h-4" />
            Create Class
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Total Classes" value={isLoading ? null : stats.total} icon={School2} color="bg-brand-50 text-brand-600" loading={isLoading} onClick={clearFilters} />
        <StatCard title="Teachers Assigned" value={isLoading ? null : stats.assignedTeacher} icon={UserCheck} color="bg-status-successBg text-status-success" loading={isLoading} onClick={() => setTeacherFilter('Assigned')} />
        <StatCard title="Rooms Set" value={isLoading ? null : stats.withRoom} icon={Building2} color="bg-blue-50 text-blue-600" loading={isLoading} />
        <StatCard title="Capacities Set" value={isLoading ? null : stats.withCapacity} icon={Users} color="bg-orange-50 text-orange-600" loading={isLoading} />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
          <div className="relative flex-1 min-w-55 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search classes..."
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
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          <div className="ml-auto">
            <span className="text-xs text-text-muted">{filtered.length} records</span>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-surface-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Academic Year:</span>
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7">
                <option value="All">All Years</option>
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Grade:</span>
              <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7">
                <option value="All">All Grades</option>
                {gradeOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Teacher:</span>
              <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7">
                <option value="All">All</option>
                <option value="Assigned">Assigned</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {['Class', 'Grade', 'Academic Year', 'Teacher', 'Room', 'Capacity', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-4 bg-surface-hover rounded" style={{ width: `${40 + (i + j * 9) % 50}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <School2 className="w-10 h-10 text-text-muted" />
                      <div>
                        <p className="font-semibold text-text-primary">No classes found</p>
                        <p className="text-xs text-text-muted mt-1">{activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Create your first class'}</p>
                      </div>
                      {activeFiltersCount === 0 && (
                        <button onClick={() => navigate('/admin/classes/new')} className="btn-primary text-xs h-8 px-4">
                          <Plus className="w-3.5 h-3.5" /> Create Class
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const teacherName = getTeacherName(c.profiles);
                  return (
                    <tr key={c.id} className="hover:bg-surface-muted/40 transition-colors group/row">
                      <td className="px-4 py-3">
                        <Link to={`/admin/classes/${c.id}`} className="font-semibold text-text-primary hover:text-brand-600 transition-colors text-sm">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{c.grade_levels?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{c.academic_years?.label || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{teacherName || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{c.room || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{c.capacity || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <Link to={`/admin/classes/${c.id}`} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
            <span>
              Showing <span className="font-semibold text-text-primary">{filtered.length}</span> of <span className="font-semibold text-text-primary">{classList.length}</span> classes
            </span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteClass.isPending}
        title={`Delete ${deleteTarget?.name}?`}
        message="This permanently removes the class record. Students assigned to this class will become unassigned."
        confirmLabel="Delete Class"
      />
    </div>
  );
}
