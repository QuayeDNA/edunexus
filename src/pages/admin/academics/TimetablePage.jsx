import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Clock3,
  Building2,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import {
  useTimetableAssignments,
  useTimetableSlots,
  useCreateTimetableSlot,
  useDeleteTimetableSlot,
} from '../../../hooks/useTimetable.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';

const DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
];

const PERIOD_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

// TODO: Implement drag-and-drop timetable grid (days x periods) with real-time conflict preview.
// Suggested approach: dnd-kit with slot-level drop targets and optimistic React Query updates.

const DEFAULT_SLOT_FORM = {
  class_id: '',
  class_subject_id: '',
  day_of_week: 1,
  period_number: 1,
  start_time: '08:00',
  end_time: '08:40',
  room: '',
};

const getStaffName = (staff) =>
  `${staff?.first_name ?? ''} ${staff?.last_name ?? ''}`.trim() || 'Unassigned';

const getDayLabel = (day) => DAY_OPTIONS.find((d) => d.value === day)?.label ?? 'Unknown';

const toMinute = (timeText) => {
  if (!timeText) return null;
  const [h, m] = timeText.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export default function TimetableBuilderPage() {
  const { schoolId } = useAuthContext();

  const [classFilter, setClassFilter] = useState('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [slotForm, setSlotForm] = useState(DEFAULT_SLOT_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: classesResult } = useClasses(schoolId);
  const { data: assignmentsResult, isLoading: assignmentsLoading } = useTimetableAssignments({
    schoolId,
    classId: classFilter !== 'All' ? classFilter : undefined,
  });
  const { data: slotsResult, isLoading: slotsLoading } = useTimetableSlots({
    schoolId,
    classId: classFilter !== 'All' ? classFilter : undefined,
  });

  const createSlot = useCreateTimetableSlot();
  const deleteSlot = useDeleteTimetableSlot();

  const classes = classesResult?.data ?? [];
  const assignments = assignmentsResult?.data ?? [];
  const slots = slotsResult?.data ?? [];

  const effectiveClassId = slotForm.class_id || (classFilter !== 'All' ? classFilter : '');

  const assignmentsForSelectedClass = useMemo(
    () => assignments.filter((row) => row.class_id === effectiveClassId),
    [assignments, effectiveClassId]
  );

  const stats = useMemo(() => {
    const totalSlots = slots.length;
    const totalAssignments = assignments.length;
    const classesCovered = new Set(slots.map((row) => row.class_id)).size;
    const teachersUsed = new Set(
      slots
        .map((row) => row.class_subjects?.staff?.id)
        .filter(Boolean)
    ).size;
    return { totalSlots, totalAssignments, classesCovered, teachersUsed };
  }, [slots, assignments]);

  const conflictWarnings = useMemo(() => {
    const warnings = [];
    const keyToSlots = {};

    slots.forEach((slot) => {
      const key = `${slot.day_of_week}-${slot.period_number}`;
      if (!keyToSlots[key]) keyToSlots[key] = [];
      keyToSlots[key].push(slot);
    });

    Object.values(keyToSlots).forEach((group) => {
      const teacherMap = {};
      const roomMap = {};

      group.forEach((slot) => {
        const teacherId = slot.class_subjects?.staff?.id;
        if (teacherId) {
          if (!teacherMap[teacherId]) teacherMap[teacherId] = [];
          teacherMap[teacherId].push(slot);
        }

        const roomText = (slot.room || '').trim().toLowerCase();
        if (roomText) {
          if (!roomMap[roomText]) roomMap[roomText] = [];
          roomMap[roomText].push(slot);
        }
      });

      Object.values(teacherMap).forEach((teacherSlots) => {
        if (teacherSlots.length > 1) {
          const sample = teacherSlots[0];
          warnings.push(
            `Teacher conflict on ${getDayLabel(sample.day_of_week)} Period ${sample.period_number}: ${getStaffName(sample.class_subjects?.staff)}`
          );
        }
      });

      Object.entries(roomMap).forEach(([room, roomSlots]) => {
        if (roomSlots.length > 1) {
          const sample = roomSlots[0];
          warnings.push(
            `Room conflict on ${getDayLabel(sample.day_of_week)} Period ${sample.period_number}: ${room.toUpperCase()}`
          );
        }
      });
    });

    return warnings;
  }, [slots]);

  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        if (a.period_number !== b.period_number) return a.period_number - b.period_number;
        return (a.start_time || '').localeCompare(b.start_time || '');
      }),
    [slots]
  );

  const resetSlotForm = () => {
    setSlotForm({
      ...DEFAULT_SLOT_FORM,
      class_id: classFilter !== 'All' ? classFilter : '',
    });
  };

  const handleClassFilterChange = (value) => {
    setClassFilter(value);
    setSlotForm((prev) => ({
      ...prev,
      class_id: value !== 'All' ? value : '',
      class_subject_id: '',
    }));
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();

    const classId = slotForm.class_id || (classFilter !== 'All' ? classFilter : '');
    if (!classId) {
      toast.error('Select a class');
      return;
    }
    if (!slotForm.class_subject_id) {
      toast.error('Select a class-subject assignment');
      return;
    }

    const startMinute = toMinute(slotForm.start_time);
    const endMinute = toMinute(slotForm.end_time);
    if (startMinute === null || endMinute === null || endMinute <= startMinute) {
      toast.error('End time must be after start time');
      return;
    }

    const duplicate = slots.some(
      (row) =>
        row.class_id === classId &&
        row.day_of_week === Number(slotForm.day_of_week) &&
        row.period_number === Number(slotForm.period_number)
    );
    if (duplicate) {
      toast.error('This class already has a slot for the selected day and period');
      return;
    }

    await createSlot.mutateAsync({
      class_id: classId,
      class_subject_id: slotForm.class_subject_id,
      day_of_week: Number(slotForm.day_of_week),
      period_number: Number(slotForm.period_number),
      start_time: slotForm.start_time,
      end_time: slotForm.end_time,
      room: slotForm.room.trim() || null,
    });

    setShowCreateForm(false);
    resetSlotForm();
  };

  const handleDeleteSlot = async () => {
    if (!deleteTarget) return;
    await deleteSlot.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable Builder"
        subtitle="Build and manage class timetables"
        actions={
          <button
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              if (!showCreateForm) resetSlotForm();
            }}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Close Form' : 'Add Slot'}
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Timetable Slots" value={slotsLoading ? null : stats.totalSlots} icon={CalendarDays} color="bg-brand-50 text-brand-600" loading={slotsLoading} />
        <StatCard title="Class Subjects" value={assignmentsLoading ? null : stats.totalAssignments} icon={BookOpen} color="bg-blue-50 text-blue-600" loading={assignmentsLoading} />
        <StatCard title="Classes Covered" value={slotsLoading ? null : stats.classesCovered} icon={Building2} color="bg-purple-50 text-purple-600" loading={slotsLoading} />
        <StatCard title="Teachers Scheduled" value={slotsLoading ? null : stats.teachersUsed} icon={Clock3} color="bg-status-successBg text-status-success" loading={slotsLoading} />
      </div>

      {conflictWarnings.length > 0 && (
        <div className="bg-status-warningBg border border-status-warning/40 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-status-warning">Conflict warnings</p>
              <ul className="text-xs text-status-warning mt-1 space-y-1">
                {conflictWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-text-secondary">Class Filter</label>
          <select
            value={classFilter}
            onChange={(e) => handleClassFilterChange(e.target.value)}
            className="text-sm border border-border rounded-md px-2 py-1.5 bg-white text-text-primary h-9"
          >
            <option value="All">All Classes</option>
            {classes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
                {row.grade_levels?.name ? ` (${row.grade_levels.name})` : ''}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-muted ml-auto">{sortedSlots.length} slots shown</span>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateSlot} className="p-4 border-b border-border bg-surface-muted/40">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Class</label>
                <select
                  value={slotForm.class_id || (classFilter !== 'All' ? classFilter : '')}
                  onChange={(e) =>
                    setSlotForm((prev) => ({
                      ...prev,
                      class_id: e.target.value,
                      class_subject_id: '',
                    }))
                  }
                  className="input-base h-9 text-sm"
                >
                  <option value="">Select class...</option>
                  {classes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                      {row.grade_levels?.name ? ` (${row.grade_levels.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Class Subject</label>
                <select
                  value={slotForm.class_subject_id}
                  onChange={(e) =>
                    setSlotForm((prev) => ({ ...prev, class_subject_id: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                >
                  <option value="">Select assignment...</option>
                  {assignmentsForSelectedClass.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.subjects?.name}
                      {row.subjects?.code ? ` (${row.subjects.code})` : ''}
                      {row.staff ? ` - ${getStaffName(row.staff)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Day</label>
                <select
                  value={slotForm.day_of_week}
                  onChange={(e) =>
                    setSlotForm((prev) => ({ ...prev, day_of_week: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                >
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Period</label>
                <select
                  value={slotForm.period_number}
                  onChange={(e) =>
                    setSlotForm((prev) => ({ ...prev, period_number: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                >
                  {PERIOD_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Start</label>
                <input
                  type="time"
                  value={slotForm.start_time}
                  onChange={(e) =>
                    setSlotForm((prev) => ({ ...prev, start_time: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">End</label>
                <input
                  type="time"
                  value={slotForm.end_time}
                  onChange={(e) =>
                    setSlotForm((prev) => ({ ...prev, end_time: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Room (optional)</label>
                <input
                  value={slotForm.room}
                  onChange={(e) => setSlotForm((prev) => ({ ...prev, room: e.target.value }))}
                  placeholder="Block B - Room 6"
                  className="input-base h-9 text-sm"
                />
              </div>
              <div className="md:col-span-3 flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetSlotForm();
                  }}
                  className="btn-secondary text-xs h-9"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs h-9" disabled={createSlot.isPending}>
                  {createSlot.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create Slot
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {['Day', 'Period', 'Time', 'Class', 'Subject', 'Teacher', 'Room', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slotsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-surface-hover rounded" style={{ width: `${42 + ((i + j) * 7) % 45}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedSlots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <p className="font-medium text-text-primary">No timetable slots yet</p>
                    <p className="text-xs text-text-muted mt-1">Create class-subject assignments first, then add timetable slots.</p>
                  </td>
                </tr>
              ) : (
                sortedSlots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-surface-muted/30 transition-colors group/row">
                    <td className="px-4 py-3 text-text-primary font-medium">{getDayLabel(slot.day_of_week)}</td>
                    <td className="px-4 py-3 text-text-secondary">Period {slot.period_number}</td>
                    <td className="px-4 py-3 text-text-secondary">{slot.start_time} - {slot.end_time}</td>
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {slot.classes?.name}
                      {slot.classes?.grade_levels?.name ? ` (${slot.classes.grade_levels.name})` : ''}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium">
                      {slot.class_subjects?.subjects?.name}
                      {slot.class_subjects?.subjects?.code ? (
                        <span className="text-text-muted text-xs font-mono"> {`(${slot.class_subjects.subjects.code})`}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{getStaffName(slot.class_subjects?.staff)}</td>
                    <td className="px-4 py-3 text-text-secondary">{slot.room || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={() => setDeleteTarget(slot)}
                          className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors"
                          title="Delete Slot"
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
        onConfirm={handleDeleteSlot}
        loading={deleteSlot.isPending}
        title="Delete timetable slot?"
        message="This removes the selected timetable slot for the class."
        confirmLabel="Delete Slot"
      />
    </div>
  );
}
