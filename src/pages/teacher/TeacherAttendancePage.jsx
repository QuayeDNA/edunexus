import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCheck, Loader2, Save, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import {
  ATTENDANCE_LOCK_WINDOW_HOURS,
  isAttendanceDateLocked,
} from '../../utils/attendance.js';
import {
  useAttendanceRoster,
  useAttendanceRows,
  useSaveAttendanceBatch,
  useTeacherClasses,
} from '../../hooks/useAttendance.js';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'];
const EMPTY_ARRAY = [];

const areDraftsEqual = (left, right) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key) => {
    const leftEntry = left[key] ?? {};
    const rightEntry = right[key] ?? {};
    return leftEntry.status === rightEntry.status && leftEntry.remarks === rightEntry.remarks;
  });
};

const TEACHER_ATTENDANCE_TODOS = [
  'Offline-first marking mode with deferred sync',
  'Parent alert automation for absent or late learners',
  'Excuse-note request and approval directly from class register',
  'Realtime attendance trend widgets by week and month',
];

const getStatusBtnClass = (status, active) => {
  if (active) {
    if (status === 'Present') return 'bg-status-successBg text-status-success border-status-success';
    if (status === 'Absent') return 'bg-status-dangerBg text-status-danger border-status-danger';
    if (status === 'Late') return 'bg-status-warningBg text-status-warning border-status-warning';
    return 'bg-status-infoBg text-status-info border-status-info';
  }

  return 'bg-white text-text-secondary border-border hover:bg-surface-muted';
};

export default function TeacherAttendancePage() {
  const { schoolId, user } = useAuthContext();
  const navigate = useNavigate();
  const { classId: routeClassId } = useParams();

  const [selectedClassId, setSelectedClassId] = useState(routeClassId ?? '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});

  const { data: teacherClassesResult, isLoading: classesLoading } = useTeacherClasses(schoolId, user?.id);
  const teacherClasses = teacherClassesResult?.data ?? [];

  useEffect(() => {
    if (routeClassId && routeClassId !== selectedClassId) {
      setSelectedClassId(routeClassId);
    }
  }, [routeClassId, selectedClassId]);

  useEffect(() => {
    if (teacherClasses.length === 0 || selectedClassId) return;

    const nextClassId = teacherClasses[0].id;
    setSelectedClassId(nextClassId);
    navigate(`/teacher/attendance/${nextClassId}`, { replace: true });
  }, [teacherClasses, selectedClassId, navigate]);

  const hasClassAccess = useMemo(() => {
    if (!selectedClassId) return true;
    return teacherClasses.some((c) => c.id === selectedClassId);
  }, [teacherClasses, selectedClassId]);

  const { data: rosterData, isLoading: rosterLoading } = useAttendanceRoster(
    hasClassAccess ? selectedClassId : ''
  );
  const { data: attendanceResult, isLoading: rowsLoading } = useAttendanceRows(
    hasClassAccess ? selectedClassId : '',
    selectedDate
  );
  const saveBatch = useSaveAttendanceBatch();
  const isSelectedDateLocked = useMemo(
    () => isAttendanceDateLocked(selectedDate),
    [selectedDate]
  );

  const roster = rosterData ?? EMPTY_ARRAY;
  const rows = attendanceResult?.data ?? EMPTY_ARRAY;

  const attendanceByStudent = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      if (!map[row.student_id]) map[row.student_id] = row;
    });
    return map;
  }, [rows]);

  useEffect(() => {
    if (!selectedClassId || !hasClassAccess || roster.length === 0) {
      setDrafts((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const nextDrafts = {};
    roster.forEach((student) => {
      const existing = attendanceByStudent[student.id];
      nextDrafts[student.id] = {
        status: existing?.status ?? 'Present',
        remarks: existing?.remarks ?? '',
      };
    });

    setDrafts((prev) => (areDraftsEqual(prev, nextDrafts) ? prev : nextDrafts));
  }, [selectedClassId, hasClassAccess, roster, attendanceByStudent]);

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roster;

    return roster.filter((student) => {
      const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.toLowerCase();
      const idNumber = (student.student_id_number ?? '').toLowerCase();
      return fullName.includes(query) || idNumber.includes(query);
    });
  }, [roster, search]);

  const stats = useMemo(() => {
    const result = {
      classes: teacherClasses.length,
      total: roster.length,
      present: 0,
      absent: 0,
      late: 0,
    };

    roster.forEach((student) => {
      const status = drafts[student.id]?.status ?? 'Present';
      if (status === 'Present') result.present += 1;
      if (status === 'Absent') result.absent += 1;
      if (status === 'Late') result.late += 1;
    });

    return result;
  }, [teacherClasses, roster, drafts]);

  const updateDraft = (studentId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status ?? 'Present',
        remarks: prev[studentId]?.remarks ?? '',
        ...patch,
      },
    }));
  };

  const markAllPresent = () => {
    if (roster.length === 0) return;

    setDrafts((prev) => {
      const next = { ...prev };
      roster.forEach((student) => {
        next[student.id] = {
          status: 'Present',
          remarks: prev[student.id]?.remarks ?? '',
        };
      });
      return next;
    });
    toast.success('All students marked Present');
  };

  const handleClassChange = (nextClassId) => {
    setSelectedClassId(nextClassId);
    if (nextClassId) {
      navigate(`/teacher/attendance/${nextClassId}`);
    } else {
      navigate('/teacher/attendance');
    }
  };

  const handleSave = async () => {
    if (!selectedClassId || !hasClassAccess) {
      toast.error('Select one of your assigned classes first');
      return;
    }

    if (isSelectedDateLocked) {
      toast.error(
        `Attendance is locked after ${ATTENDANCE_LOCK_WINDOW_HOURS} hours. Contact an admin for override.`
      );
      return;
    }

    const payloadRows = roster.map((student) => {
      const draft = drafts[student.id] ?? { status: 'Present', remarks: '' };
      return {
        student_id: student.id,
        status: draft.status,
        remarks: draft.remarks,
      };
    });

    await saveBatch.mutateAsync({
      classId: selectedClassId,
      date: selectedDate,
      markedBy: user?.id,
      rows: payloadRows,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Class Attendance"
        subtitle="Mark daily attendance for your assigned classes"
        actions={
          <button
            onClick={handleSave}
            disabled={
              saveBatch.isPending ||
              !selectedClassId ||
              roster.length === 0 ||
              !hasClassAccess ||
              isSelectedDateLocked
            }
            className="btn-primary text-sm"
          >
            {saveBatch.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Attendance
              </>
            )}
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="input-base h-9 text-sm"
              disabled={classesLoading}
            >
              <option value="">Select class...</option>
              {teacherClasses.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}{row.grade_levels?.name ? ` (${row.grade_levels.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
            <div className="relative">
              <CalendarDays className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-base h-9 text-sm pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Student name or ID"
                className="input-base h-9 text-sm pl-9"
              />
            </div>
          </div>

          <div className="flex items-end justify-end">
            <button
              onClick={markAllPresent}
              className="btn-secondary text-sm h-9"
              disabled={roster.length === 0 || !hasClassAccess || isSelectedDateLocked}
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Present
            </button>
          </div>
        </div>
      </div>

      {isSelectedDateLocked ? (
        <div className="bg-status-warningBg rounded-xl border border-status-warning/30 p-4 text-sm text-status-warning">
          Editing attendance is locked after {ATTENDANCE_LOCK_WINDOW_HOURS} hours. Contact an admin for override.
        </div>
      ) : null}

      {!classesLoading && teacherClasses.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-card p-10 text-center text-sm text-text-secondary">
          No classes are currently assigned to your profile.
        </div>
      ) : !hasClassAccess ? (
        <div className="bg-status-warningBg rounded-xl border border-status-warning/30 p-4 text-sm text-status-warning">
          You cannot mark attendance for this class. Select one of your assigned classes.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard title="My Classes" value={stats.classes} loading={classesLoading} />
            <StatCard title="Students" value={stats.total} loading={rosterLoading || rowsLoading} />
            <StatCard title="Present" value={stats.present} color="bg-status-successBg text-status-success" loading={rosterLoading || rowsLoading} />
            <StatCard title="Absent" value={stats.absent} color="bg-status-dangerBg text-status-danger" loading={rosterLoading || rowsLoading} />
            <StatCard title="Late" value={stats.late} color="bg-status-warningBg text-status-warning" loading={rosterLoading || rowsLoading} />
          </div>

          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40">
                    {['Student', 'Student ID', 'Status', 'Remarks'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rosterLoading || rowsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 4 }).map((__, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-4 bg-surface-hover rounded" style={{ width: `${40 + ((i + j) * 9) % 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-text-muted">No active students found for this class.</td>
                    </tr>
                  ) : (
                    filteredRoster.map((student) => {
                      const draft = drafts[student.id] ?? { status: 'Present', remarks: '' };
                      return (
                        <tr key={student.id} className="hover:bg-surface-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-text-primary">
                            {student.first_name} {student.last_name}
                          </td>
                          <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                            {student.student_id_number || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {STATUS_OPTIONS.map((status) => {
                                const active = draft.status === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateDraft(student.id, { status })}
                                    disabled={isSelectedDateLocked}
                                    className={`px-2 py-1 rounded-md border text-xs font-semibold transition-colors ${getStatusBtnClass(status, active)}`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={draft.remarks}
                              onChange={(e) => updateDraft(student.id, { remarks: e.target.value })}
                              placeholder="Optional remark"
                              className="input-base h-8 text-sm"
                              disabled={isSelectedDateLocked}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <h2 className="text-sm font-semibold text-text-primary">Attendance TODO Roadmap</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Upcoming improvements planned for the teacher attendance experience.
        </p>
        <ul className="mt-3 space-y-1 list-disc list-inside text-sm text-text-secondary">
          {TEACHER_ATTENDANCE_TODOS.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
