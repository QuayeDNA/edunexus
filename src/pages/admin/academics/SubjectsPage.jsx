import { useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  SlidersHorizontal,
  Search,
  X,
  Edit2,
  Trash2,
  Loader2,
  Link2,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import { useStaff } from '../../../hooks/useStaff.js';
import {
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  useSubjectAssignments,
  useCreateSubjectAssignment,
  useDeleteSubjectAssignment,
} from '../../../hooks/useSubjects.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import { cn } from '../../../utils/cn.js';

const SUBJECT_CATEGORIES = ['Core', 'Elective', 'Extracurricular'];
const LEVEL_GROUP_OPTIONS = ['nursery', 'primary', 'jhs', 'shs', 'secondary'];

const EMPTY_SUBJECT_FORM = {
  name: '',
  code: '',
  category: 'Core',
  level_group: '',
  is_active: true,
};

const EMPTY_ASSIGNMENT_FORM = {
  class_id: '',
  subject_id: '',
  teacher_id: '',
  periods_per_week: 5,
};

const getStaffName = (staff) =>
  `${staff?.first_name ?? ''} ${staff?.last_name ?? ''}`.trim() || 'Unassigned';

export default function SubjectsPage() {
  const { schoolId } = useAuthContext();

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT_FORM);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT_FORM);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState(null);

  const subjectFilters = useMemo(
    () => ({
      schoolId,
      search: searchQuery.trim() || undefined,
      category: categoryFilter !== 'All' ? categoryFilter : undefined,
      levelGroup: levelFilter !== 'All' ? levelFilter : undefined,
      activeOnly:
        statusFilter === 'Active'
          ? true
          : statusFilter === 'Inactive'
            ? false
            : undefined,
    }),
    [schoolId, searchQuery, categoryFilter, levelFilter, statusFilter]
  );

  const { data: subjectsResult, isLoading: subjectsLoading } = useSubjects(subjectFilters);
  const { data: allSubjectsResult } = useSubjects({ schoolId });
  const { data: assignmentsResult, isLoading: assignmentsLoading } = useSubjectAssignments(schoolId);
  const { data: classesResult } = useClasses(schoolId);
  const { data: staffResult } = useStaff({ schoolId, limit: 500 });

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const createAssignment = useCreateSubjectAssignment();
  const deleteAssignment = useDeleteSubjectAssignment();

  const subjects = subjectsResult?.data ?? [];
  const allSubjects = allSubjectsResult?.data ?? [];
  const assignments = assignmentsResult?.data ?? [];
  const classes = classesResult?.data ?? [];

  const teachers = useMemo(() => {
    const teachingRoles = new Set(['Teacher', 'Head Teacher']);
    const rows = staffResult?.data ?? [];
    return rows.filter((row) => teachingRoles.has(row.role));
  }, [staffResult]);

  const assignmentCountBySubject = useMemo(() => {
    const countMap = {};
    assignments.forEach((item) => {
      countMap[item.subject_id] = (countMap[item.subject_id] ?? 0) + 1;
    });
    return countMap;
  }, [assignments]);

  const stats = useMemo(() => {
    const total = allSubjects.length;
    const active = allSubjects.filter((s) => s.is_active).length;
    const core = allSubjects.filter((s) => s.category === 'Core').length;
    const elective = allSubjects.filter((s) => s.category === 'Elective').length;
    return { total, active, core, elective };
  }, [allSubjects]);

  const activeFiltersCount = [categoryFilter, levelFilter, statusFilter].filter(
    (v) => v !== 'All'
  ).length;

  const resetSubjectForm = () => {
    setSubjectForm(EMPTY_SUBJECT_FORM);
    setEditingSubjectId(null);
    setShowSubjectForm(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setLevelFilter('All');
    setStatusFilter('All');
  };

  const startCreateSubject = () => {
    setEditingSubjectId(null);
    setSubjectForm(EMPTY_SUBJECT_FORM);
    setShowSubjectForm(true);
  };

  const startEditSubject = (subject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      name: subject.name ?? '',
      code: subject.code ?? '',
      category: subject.category ?? 'Core',
      level_group: subject.level_group ?? '',
      is_active: !!subject.is_active,
    });
    setShowSubjectForm(true);
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();

    if (!subjectForm.name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    const payload = {
      school_id: schoolId,
      name: subjectForm.name.trim(),
      code: subjectForm.code.trim() || null,
      category: subjectForm.category,
      level_group: subjectForm.level_group || null,
      is_active: !!subjectForm.is_active,
    };

    if (editingSubjectId) {
      await updateSubject.mutateAsync({ id: editingSubjectId, data: payload });
    } else {
      await createSubject.mutateAsync(payload);
    }

    resetSubjectForm();
  };

  const handleDeleteSubject = async () => {
    if (!deleteTarget) return;

    if ((assignmentCountBySubject[deleteTarget.id] ?? 0) > 0) {
      toast.error('Remove class assignments for this subject first');
      setDeleteTarget(null);
      return;
    }

    await deleteSubject.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();

    if (!assignmentForm.class_id || !assignmentForm.subject_id) {
      toast.error('Select both class and subject');
      return;
    }

    const duplicate = assignments.some(
      (row) =>
        row.class_id === assignmentForm.class_id &&
        row.subject_id === assignmentForm.subject_id
    );
    if (duplicate) {
      toast.error('This subject is already assigned to the selected class');
      return;
    }

    await createAssignment.mutateAsync({
      class_id: assignmentForm.class_id,
      subject_id: assignmentForm.subject_id,
      teacher_id: assignmentForm.teacher_id || null,
      periods_per_week: Number(assignmentForm.periods_per_week || 5),
    });

    setAssignmentForm((prev) => ({
      ...EMPTY_ASSIGNMENT_FORM,
      class_id: prev.class_id,
    }));
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentTarget) return;
    await deleteAssignment.mutateAsync(deleteAssignmentTarget.id);
    setDeleteAssignmentTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        subtitle={`${stats.total} subjects configured`}
        actions={
          <button onClick={startCreateSubject} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Subjects"
          value={subjectsLoading ? null : stats.total}
          icon={BookOpen}
          color="bg-brand-50 text-brand-600"
          loading={subjectsLoading}
        />
        <StatCard
          title="Active"
          value={subjectsLoading ? null : stats.active}
          icon={UserCheck}
          color="bg-status-successBg text-status-success"
          loading={subjectsLoading}
        />
        <StatCard
          title="Core"
          value={subjectsLoading ? null : stats.core}
          icon={BookOpen}
          color="bg-blue-50 text-blue-600"
          loading={subjectsLoading}
        />
        <StatCard
          title="Elective"
          value={subjectsLoading ? null : stats.elective}
          icon={BookOpen}
          color="bg-purple-50 text-purple-600"
          loading={subjectsLoading}
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
          <div className="relative flex-1 min-w-60 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects..."
              className="input-base pl-9 h-9 text-sm w-full"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn-secondary h-9 px-3 text-xs gap-2',
              showFilters && 'bg-brand-50 border-brand-200 text-brand-700'
            )}
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

          <div className="ml-auto">
            <span className="text-xs text-text-muted">{subjects.length} records</span>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-surface-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7"
              >
                <option value="All">All Categories</option>
                {SUBJECT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Level:</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7"
              >
                <option value="All">All Levels</option>
                {LEVEL_GROUP_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-7"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        {showSubjectForm && (
          <form onSubmit={handleSubjectSubmit} className="p-4 border-b border-border bg-surface-muted/40">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Subject name</label>
                <input
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-base h-9 text-sm"
                  placeholder="Mathematics"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Code</label>
                <input
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="input-base h-9 text-sm"
                  placeholder="MTH"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
                <select
                  value={subjectForm.category}
                  onChange={(e) => setSubjectForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="input-base h-9 text-sm"
                >
                  {SUBJECT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Level Group</label>
                <select
                  value={subjectForm.level_group}
                  onChange={(e) => setSubjectForm((prev) => ({ ...prev, level_group: e.target.value }))}
                  className="input-base h-9 text-sm"
                >
                  <option value="">All / General</option>
                  {LEVEL_GROUP_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
                <select
                  value={subjectForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setSubjectForm((prev) => ({
                      ...prev,
                      is_active: e.target.value === 'active',
                    }))
                  }
                  className="input-base h-9 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="submit"
                className="btn-primary text-xs h-8"
                disabled={createSubject.isPending || updateSubject.isPending}
              >
                {createSubject.isPending || updateSubject.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    {editingSubjectId ? 'Update Subject' : 'Create Subject'}
                  </>
                )}
              </button>

              <button type="button" onClick={resetSubjectForm} className="btn-secondary text-xs h-8">
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {['Subject', 'Code', 'Category', 'Level', 'Status', 'Assigned Classes', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subjectsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className="h-4 bg-surface-hover rounded"
                          style={{ width: `${40 + ((i + j) * 9) % 45}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="font-semibold text-text-primary">No subjects found</p>
                    <p className="text-xs text-text-muted mt-1">
                      Add your first subject to start building class timetables and assessments.
                    </p>
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-surface-muted/40 transition-colors group/row">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text-primary">{subject.name}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {subject.code || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-brand-50 text-brand-700">
                        {subject.category || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {subject.level_group ? subject.level_group.toUpperCase() : 'ALL'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={subject.is_active ? 'Active' : 'Inactive'} dot />
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-medium">
                      {assignmentCountBySubject[subject.id] ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditSubject(subject)}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(subject)}
                          className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors"
                          title="Delete"
                        >
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
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Class Subject Assignments</h2>
            <p className="text-xs text-text-muted mt-0.5">Link subjects to classes and assign teachers.</p>
          </div>
          <span className="text-xs text-text-muted">{assignments.length} assignments</span>
        </div>

        <form onSubmit={handleAssignmentSubmit} className="p-4 border-b border-border bg-surface-muted/40">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Class</label>
              <select
                value={assignmentForm.class_id}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({ ...prev, class_id: e.target.value }))
                }
                className="input-base h-9 text-sm"
              >
                <option value="">Select class...</option>
                {classes.map((classRow) => (
                  <option key={classRow.id} value={classRow.id}>
                    {classRow.name}
                    {classRow.grade_levels?.name ? ` (${classRow.grade_levels.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
              <select
                value={assignmentForm.subject_id}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({ ...prev, subject_id: e.target.value }))
                }
                className="input-base h-9 text-sm"
              >
                <option value="">Select subject...</option>
                {allSubjects
                  .filter((subject) => subject.is_active)
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                      {subject.code ? ` (${subject.code})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Teacher</label>
              <select
                value={assignmentForm.teacher_id}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({ ...prev, teacher_id: e.target.value }))
                }
                className="input-base h-9 text-sm"
              >
                <option value="">Unassigned</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {getStaffName(teacher)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Periods / Week</label>
              <input
                type="number"
                min="1"
                max="20"
                value={assignmentForm.periods_per_week}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    periods_per_week: e.target.value,
                  }))
                }
                className="input-base h-9 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button type="submit" className="btn-primary text-xs h-9 w-full" disabled={createAssignment.isPending}>
                {createAssignment.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    Assign Subject
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {['Class', 'Subject', 'Teacher', 'Periods/Week', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignmentsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className="h-4 bg-surface-hover rounded"
                          style={{ width: `${45 + ((i + j) * 8) % 40}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <p className="font-medium text-text-primary">No assignments yet</p>
                    <p className="text-xs text-text-muted mt-1">Create a subject assignment to power timetable and assessment setup.</p>
                  </td>
                </tr>
              ) : (
                assignments.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted/30 transition-colors group/row">
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {row.classes?.name}
                      {row.classes?.grade_levels?.name
                        ? ` (${row.classes.grade_levels.name})`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {row.subjects?.name}
                      {row.subjects?.code ? (
                        <span className="text-text-muted text-xs font-mono"> {`(${row.subjects.code})`}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{getStaffName(row.staff)}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.periods_per_week ?? 5}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={() => setDeleteAssignmentTarget(row)}
                          className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors"
                          title="Remove Assignment"
                        >
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
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSubject}
        loading={deleteSubject.isPending}
        title={`Delete ${deleteTarget?.name || 'subject'}?`}
        message="This permanently removes the subject. If it is assigned to any class, remove those assignments first."
        confirmLabel="Delete Subject"
      />

      <ConfirmDialog
        open={!!deleteAssignmentTarget}
        onClose={() => setDeleteAssignmentTarget(null)}
        onConfirm={handleDeleteAssignment}
        loading={deleteAssignment.isPending}
        title="Remove subject assignment?"
        message="This will unlink the subject from the class. Timetable and assessment setups for this pair may be affected."
        confirmLabel="Remove Assignment"
      />
    </div>
  );
}
