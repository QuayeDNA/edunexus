import { useMemo, useState } from 'react';
import { Loader2, ChevronLeft, School2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useStaff } from '../../../hooks/useStaff.js';
import { useAcademicYears } from '../../../hooks/useSchool.js';
import { useCreateClass } from '../../../hooks/useClasses.js';
import { gradeLevelsApi } from '../../../services/api/gradeLevels.js';
import { cn } from '../../../utils/cn.js';

const FIELD_CLS = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-300 transition-all placeholder:text-text-muted';
const LABEL_CLS = 'block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5';

function teacherName(staff) {
  return `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unnamed';
}

export default function ClassNewPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();

  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    grade_level_id: '',
    academic_year_id: '',
    class_teacher_staff_id: '',
    room: '',
    capacity: '',
  });

  const createClass = useCreateClass();
  const { data: yearsData } = useAcademicYears(schoolId);
  const { data: staffData } = useStaff({ schoolId, limit: 500 });
  const { data: levelsData, isLoading: loadingLevels } = useQuery({
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

  const selectedTeacher = teachers.find(t => t.id === form.class_teacher_staff_id);

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Class name is required';
    if (!form.grade_level_id) nextErrors.grade_level_id = 'Grade level is required';
    if (!form.academic_year_id) nextErrors.academic_year_id = 'Academic year is required';
    if (form.capacity && Number(form.capacity) < 1) nextErrors.capacity = 'Capacity must be at least 1';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      const created = await createClass.mutateAsync({
        school_id: schoolId,
        name: form.name.trim(),
        grade_level_id: form.grade_level_id,
        academic_year_id: form.academic_year_id,
        class_teacher_id: selectedTeacher?.profile_id || null,
        room: form.room.trim() || null,
        capacity: form.capacity ? Number(form.capacity) : null,
      });

      navigate(`/admin/classes/${created.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create class');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/classes" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Create New Class</h1>
          <p className="text-sm text-text-secondary">Set up class structure, teacher and capacity</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Class Details</h2>
          <p className="text-sm text-text-muted mt-0.5">All fields can be edited later from the class profile page.</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Class Name <span className="text-status-danger">*</span></label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={cn(FIELD_CLS, errors.name && 'border-status-danger')}
                placeholder="Primary 4A"
              />
              {errors.name && <p className="mt-1 text-xs text-status-danger">{errors.name}</p>}
            </div>

            <div>
              <label className={LABEL_CLS}>Room</label>
              <input
                value={form.room}
                onChange={e => set('room', e.target.value)}
                className={FIELD_CLS}
                placeholder="Block B - Room 6"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Grade Level <span className="text-status-danger">*</span></label>
              <select
                value={form.grade_level_id}
                onChange={e => set('grade_level_id', e.target.value)}
                className={cn(FIELD_CLS, errors.grade_level_id && 'border-status-danger')}
                disabled={loadingLevels}
              >
                <option value="">Select grade level...</option>
                {gradeLevels.map(level => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
              {errors.grade_level_id && <p className="mt-1 text-xs text-status-danger">{errors.grade_level_id}</p>}
            </div>

            <div>
              <label className={LABEL_CLS}>Academic Year <span className="text-status-danger">*</span></label>
              <select
                value={form.academic_year_id}
                onChange={e => set('academic_year_id', e.target.value)}
                className={cn(FIELD_CLS, errors.academic_year_id && 'border-status-danger')}
              >
                <option value="">Select academic year...</option>
                {years.map(year => (
                  <option key={year.id} value={year.id}>{year.label}</option>
                ))}
              </select>
              {errors.academic_year_id && <p className="mt-1 text-xs text-status-danger">{errors.academic_year_id}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Class Teacher</label>
              <select
                value={form.class_teacher_staff_id}
                onChange={e => set('class_teacher_staff_id', e.target.value)}
                className={FIELD_CLS}
              >
                <option value="">Unassigned</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacherName(teacher)}{teacher.profile_id ? '' : ' (no linked user profile)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>Capacity</label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={e => set('capacity', e.target.value)}
                className={cn(FIELD_CLS, errors.capacity && 'border-status-danger')}
                placeholder="45"
              />
              {errors.capacity && <p className="mt-1 text-xs text-status-danger">{errors.capacity}</p>}
            </div>
          </div>

          {gradeLevels.length === 0 && (
            <div className="bg-status-warningBg border border-status-warning/20 rounded-xl p-4">
              <p className="text-sm font-medium text-status-warning">No grade levels found</p>
              <p className="text-xs text-text-secondary mt-1">Create grade levels first so classes can be assigned correctly.</p>
            </div>
          )}

          {years.length === 0 && (
            <div className="bg-status-warningBg border border-status-warning/20 rounded-xl p-4">
              <p className="text-sm font-medium text-status-warning">No academic years found</p>
              <p className="text-xs text-text-secondary mt-1">Set up an academic year before creating classes.</p>
            </div>
          )}

          <div className="bg-surface-muted/60 rounded-xl p-4 border border-border flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <School2 className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Tip</p>
              <p className="text-xs text-text-secondary mt-0.5">After creating the class, use the class detail page to review roster and adjust teacher assignments.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <Link to="/admin/classes" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={createClass.isPending} className="btn-primary">
            {createClass.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Class
          </button>
        </div>
      </form>
    </div>
  );
}
