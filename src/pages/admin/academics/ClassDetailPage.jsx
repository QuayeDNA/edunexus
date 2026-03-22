import { useEffect, useMemo, useState } from 'react';
import { Loader2, Edit2, Trash2, ChevronLeft, Save, X, School2, Users, Building2, UserCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClass, useClassRoster, useUpdateClass, useDeleteClass } from '../../../hooks/useClasses.js';
import { useStaff } from '../../../hooks/useStaff.js';
import { useAcademicYears } from '../../../hooks/useSchool.js';
import { gradeLevelsApi } from '../../../services/api/gradeLevels.js';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import { cn } from '../../../utils/cn.js';

const FIELD_CLS = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-300 transition-all placeholder:text-text-muted disabled:bg-surface-muted disabled:text-text-muted';
const LABEL_CLS = 'block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5';

function teacherName(profile) {
  if (!profile) return 'Unassigned';
  if (profile.full_name) return profile.full_name;
  const first = profile.first_name || '';
  const last = profile.last_name || '';
  return `${first} ${last}`.trim() || 'Unassigned';
}

function staffName(staff) {
  return `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unnamed';
}

export default function ClassDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();

  const { data: classData, isLoading } = useClass(id);
  const { data: roster, isLoading: loadingRoster } = useClassRoster(id);
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();

  const { data: yearsData } = useAcademicYears(schoolId);
  const { data: staffData } = useStaff({ schoolId, limit: 500 });
  const { data: levelsData } = useQuery({
    queryKey: ['grade-levels', schoolId],
    queryFn: async () => {
      const { data, error } = await gradeLevelsApi.list(schoolId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  const years = yearsData?.data ?? [];
  const gradeLevels = levelsData ?? [];
  const teachers = useMemo(() => {
    const teachingRoles = new Set(['Teacher', 'Head Teacher']);
    const all = staffData?.data ?? [];
    return all.filter(s => teachingRoles.has(s.role));
  }, [staffData]);

  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({
    name: '',
    grade_level_id: '',
    academic_year_id: '',
    class_teacher_staff_id: '',
    room: '',
    capacity: '',
  });

  useEffect(() => {
    if (!classData) return;
    setForm({
      name: classData.name || '',
      grade_level_id: classData.grade_level_id || '',
      academic_year_id: classData.academic_year_id || '',
      class_teacher_staff_id: '',
      room: classData.room || '',
      capacity: classData.capacity ?? '',
    });
  }, [classData]);

  useEffect(() => {
    if (!classData?.class_teacher_id || teachers.length === 0) return;
    const assignedTeacher = teachers.find(t => t.profile_id === classData.class_teacher_id);
    if (!assignedTeacher) return;
    setForm(prev => ({ ...prev, class_teacher_staff_id: assignedTeacher.id }));
  }, [classData?.class_teacher_id, teachers]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const selectedTeacher = teachers.find(t => t.id === form.class_teacher_staff_id);

  const handleSave = async () => {
    try {
      await updateClass.mutateAsync({
        id,
        data: {
          name: form.name.trim(),
          grade_level_id: form.grade_level_id || null,
          academic_year_id: form.academic_year_id || null,
          class_teacher_id: selectedTeacher?.profile_id || null,
          room: form.room.trim() || null,
          capacity: form.capacity === '' ? null : Number(form.capacity),
        },
      });
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update class');
    }
  };

  const handleDelete = async () => {
    await deleteClass.mutateAsync(id);
    navigate('/admin/classes');
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary mb-4">Class not found.</p>
        <Link to="/admin/classes" className="btn-primary inline-flex">Back to Classes</Link>
      </div>
    );
  }

  const currentTeacher = teacherName(classData.profiles);
  const rosterList = roster ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to="/admin/classes" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-text-primary truncate">{classData.name}</h1>
          <p className="text-sm text-text-secondary">{classData.grade_levels?.name || 'Unassigned grade'} · {classData.academic_years?.label || 'No academic year'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={updateClass.isPending} className="btn-primary">
                {updateClass.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => setShowDelete(true)} className="btn-danger">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border shadow-card p-4">
          <p className="text-xs text-text-muted">Students</p>
          <p className="text-2xl font-semibold text-text-primary mt-1">{loadingRoster ? '...' : rosterList.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-card p-4">
          <p className="text-xs text-text-muted">Capacity</p>
          <p className="text-2xl font-semibold text-text-primary mt-1">{classData.capacity || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-card p-4">
          <p className="text-xs text-text-muted">Teacher</p>
          <p className="text-sm font-semibold text-text-primary mt-1 truncate">{currentTeacher}</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-card p-4">
          <p className="text-xs text-text-muted">Room</p>
          <p className="text-sm font-semibold text-text-primary mt-1">{classData.room || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Class Profile</h2>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Class Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className={FIELD_CLS} />
              </div>

              <div>
                <label className={LABEL_CLS}>Grade Level</label>
                <select value={form.grade_level_id} onChange={e => set('grade_level_id', e.target.value)} className={FIELD_CLS}>
                  <option value="">Select grade level...</option>
                  {gradeLevels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL_CLS}>Academic Year</label>
                <select value={form.academic_year_id} onChange={e => set('academic_year_id', e.target.value)} className={FIELD_CLS}>
                  <option value="">Select academic year...</option>
                  {years.map(year => (
                    <option key={year.id} value={year.id}>{year.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL_CLS}>Class Teacher</label>
                <select value={form.class_teacher_staff_id} onChange={e => set('class_teacher_staff_id', e.target.value)} className={FIELD_CLS}>
                  <option value="">Unassigned</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {staffName(teacher)}{teacher.profile_id ? '' : ' (no linked user profile)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL_CLS}>Room</label>
                <input value={form.room} onChange={e => set('room', e.target.value)} className={FIELD_CLS} />
              </div>

              <div>
                <label className={LABEL_CLS}>Capacity</label>
                <input type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} className={FIELD_CLS} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-border bg-surface-muted/40">
                <p className="text-xs text-text-muted">Class Name</p>
                <p className="text-sm font-medium text-text-primary mt-0.5 flex items-center gap-1.5"><School2 className="w-3.5 h-3.5 text-text-muted" />{classData.name}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface-muted/40">
                <p className="text-xs text-text-muted">Class Teacher</p>
                <p className="text-sm font-medium text-text-primary mt-0.5 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-text-muted" />{currentTeacher}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface-muted/40">
                <p className="text-xs text-text-muted">Room</p>
                <p className="text-sm font-medium text-text-primary mt-0.5 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-text-muted" />{classData.room || '—'}</p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-surface-muted/40">
                <p className="text-xs text-text-muted">Capacity</p>
                <p className="text-sm font-medium text-text-primary mt-0.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-text-muted" />{classData.capacity || '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Class Roster</h2>
            <p className="text-xs text-text-muted mt-0.5">Students currently assigned to this class</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40">
                  {['Student', 'Student ID', 'Gender', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingRoster ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-4 bg-surface-hover rounded" style={{ width: `${40 + (i + j * 11) % 50}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : rosterList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center">
                      <p className="font-medium text-text-primary">No students assigned</p>
                      <p className="text-xs text-text-muted mt-1">Assign students from the Students module to populate this roster.</p>
                    </td>
                  </tr>
                ) : (
                  rosterList.map(student => (
                    <tr key={student.id} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={student.photo_url} firstName={student.first_name} lastName={student.last_name} size="sm" />
                          <Link to={`/admin/students/${student.id}`} className="font-medium text-text-primary hover:text-brand-600 transition-colors">
                            {student.first_name} {student.last_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-xs">{student.student_id_number || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary">{student.gender || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold',
                          student.status === 'Active' ? 'bg-status-successBg text-status-success' : 'bg-surface-hover text-text-muted'
                        )}>
                          {student.status || '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleteClass.isPending}
        title={`Delete ${classData.name}?`}
        message="This permanently removes the class. Students assigned to it will become unassigned."
        confirmLabel="Delete Class"
      />
    </div>
  );
}
