import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCheck,
  Download,
  FileSpreadsheet,
  FilterX,
  Loader2,
  Save,
  Search,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import {
  ATTENDANCE_LOCK_WINDOW_HOURS,
  isAttendanceDateLocked,
} from '../../../utils/attendance.js';
import {
  useAttendanceReport,
  useAttendanceRoster,
  useAttendanceRows,
  useSaveAttendanceBatch,
} from '../../../hooks/useAttendance.js';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'];
const REPORT_STATUS_OPTIONS = ['All', ...STATUS_OPTIONS];
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

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const isoDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
};

const sanitizeFileName = (value) => {
  const cleaned = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'attendance-report';
};

const escapeCsv = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const downloadTextFile = (text, fileName, mimeType) => {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ATTENDANCE_TODO_FEATURES = [
  'Realtime attendance board for class teachers, admins, and parents',
  'Parent attendance digest with SMS, WhatsApp, and in-app alerts',
  'Automated anomaly detection for late and chronic absenteeism patterns',
  'Geofenced check-in with optional QR or biometric verification',
  'Excuse-note workflow with attachment uploads and approval statuses',
  'Term and year attendance analytics with cohort comparisons',
  'Attendance policy engine for custom thresholds and interventions',
  'Bulk import correction mode for historical backfills and audits',
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

export default function AttendancePage() {
  const { schoolId, user } = useAuthContext();

  const [classId, setClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});
  const [adminOverrideEnabled, setAdminOverrideEnabled] = useState(false);
  const [adminOverrideReason, setAdminOverrideReason] = useState('');
  const [reportFromDate, setReportFromDate] = useState(isoDaysAgo(14));
  const [reportToDate, setReportToDate] = useState(toIsoDate());
  const [reportClassId, setReportClassId] = useState('All');
  const [reportStatus, setReportStatus] = useState('All');
  const [reportSearch, setReportSearch] = useState('');

  const { data: classesResult, isLoading: classesLoading } = useClasses(schoolId);
  const classes = classesResult?.data ?? [];

  useEffect(() => {
    if (!classId && classes.length > 0) {
      setClassId(classes[0].id);
    }
  }, [classId, classes]);

  const { data: rosterData, isLoading: rosterLoading } = useAttendanceRoster(classId);
  const { data: attendanceResult, isLoading: rowsLoading } = useAttendanceRows(classId, selectedDate);
  const { data: reportResult, isLoading: reportLoading } = useAttendanceReport({
    classId: reportClassId !== 'All' ? reportClassId : undefined,
    startDate: reportFromDate,
    endDate: reportToDate,
    status: reportStatus !== 'All' ? reportStatus : undefined,
  });
  const saveBatch = useSaveAttendanceBatch();

  const roster = rosterData ?? EMPTY_ARRAY;
  const rows = attendanceResult?.data ?? EMPTY_ARRAY;
  const reportRows = reportResult?.data ?? EMPTY_ARRAY;

  const attendanceByStudent = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      if (!map[row.student_id]) map[row.student_id] = row;
    });
    return map;
  }, [rows]);

  useEffect(() => {
    if (!classId || roster.length === 0) {
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
  }, [classId, roster, attendanceByStudent]);

  const isSelectedDateLocked = useMemo(
    () => isAttendanceDateLocked(selectedDate),
    [selectedDate]
  );
  const canEditSelectedDate = !isSelectedDateLocked || adminOverrideEnabled;

  useEffect(() => {
    setAdminOverrideEnabled(false);
    setAdminOverrideReason('');
  }, [selectedDate, classId]);

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
      total: roster.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    roster.forEach((student) => {
      const status = drafts[student.id]?.status ?? 'Present';
      if (status === 'Present') result.present += 1;
      if (status === 'Absent') result.absent += 1;
      if (status === 'Late') result.late += 1;
      if (status === 'Excused') result.excused += 1;
    });

    return result;
  }, [roster, drafts]);

  const filteredReportRows = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    if (!query) return reportRows;

    return reportRows.filter((row) => {
      const studentName = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`
        .trim()
        .toLowerCase();
      const studentId = (row.students?.student_id_number ?? '').toLowerCase();
      const className = (row.classes?.name ?? '').toLowerCase();
      const status = (row.status ?? '').toLowerCase();
      const date = (row.date ?? '').toLowerCase();

      return (
        studentName.includes(query) ||
        studentId.includes(query) ||
        className.includes(query) ||
        status.includes(query) ||
        date.includes(query)
      );
    });
  }, [reportRows, reportSearch]);

  const reportClassLabel = useMemo(() => {
    if (reportClassId === 'All') return 'all-classes';

    const selectedClass = classes.find((row) => row.id === reportClassId);
    if (!selectedClass) return 'selected-class';

    return selectedClass.grade_levels?.name
      ? `${selectedClass.name}-${selectedClass.grade_levels.name}`
      : selectedClass.name;
  }, [classes, reportClassId]);

  const reportStats = useMemo(() => {
    const summary = {
      records: filteredReportRows.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      uniqueStudents: 0,
      attendanceRate: 0,
    };

    const students = new Set();
    filteredReportRows.forEach((row) => {
      if (row.student_id) students.add(row.student_id);

      if (row.status === 'Present') summary.present += 1;
      if (row.status === 'Absent') summary.absent += 1;
      if (row.status === 'Late') summary.late += 1;
      if (row.status === 'Excused') summary.excused += 1;
    });

    summary.uniqueStudents = students.size;
    if (summary.records > 0) {
      summary.attendanceRate =
        ((summary.present + summary.late + summary.excused) / summary.records) * 100;
    }

    return summary;
  }, [filteredReportRows]);

  const classSummaries = useMemo(() => {
    const map = {};

    filteredReportRows.forEach((row) => {
      const key = row.class_id ?? 'unknown';
      if (!map[key]) {
        map[key] = {
          className: row.classes?.name ?? 'Unknown class',
          gradeLevel: row.classes?.grade_levels?.name ?? '',
          records: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
      }

      map[key].records += 1;
      if (row.status === 'Present') map[key].present += 1;
      if (row.status === 'Absent') map[key].absent += 1;
      if (row.status === 'Late') map[key].late += 1;
      if (row.status === 'Excused') map[key].excused += 1;
    });

    return Object.values(map)
      .map((row) => ({
        ...row,
        attendanceRate:
          row.records > 0 ? ((row.present + row.late + row.excused) / row.records) * 100 : 0,
      }))
      .sort((a, b) => b.records - a.records);
  }, [filteredReportRows]);

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

  const handleSave = async () => {
    if (!classId) {
      toast.error('Select a class first');
      return;
    }

    if (isSelectedDateLocked && !adminOverrideEnabled) {
      toast.error(`Attendance is locked after ${ATTENDANCE_LOCK_WINDOW_HOURS} hours. Enable admin override.`);
      return;
    }

    if (isSelectedDateLocked && adminOverrideEnabled && !adminOverrideReason.trim()) {
      toast.error('Enter an admin override reason before saving locked attendance');
      return;
    }

    const useOverride = isSelectedDateLocked && adminOverrideEnabled;

    const payloadRows = roster.map((student) => {
      const draft = drafts[student.id] ?? { status: 'Present', remarks: '' };
      return {
        student_id: student.id,
        status: draft.status,
        remarks: draft.remarks,
        is_admin_override: useOverride,
        override_reason: useOverride ? adminOverrideReason.trim() : null,
      };
    });

    await saveBatch.mutateAsync({
      classId,
      date: selectedDate,
      markedBy: user?.id,
      rows: payloadRows,
    });
  };

  const handleClearReportFilters = () => {
    setReportFromDate(isoDaysAgo(14));
    setReportToDate(toIsoDate());
    setReportClassId('All');
    setReportStatus('All');
    setReportSearch('');
  };

  const handleExportCsv = () => {
    if (filteredReportRows.length === 0) {
      toast.error('No report rows to export');
      return;
    }

    const headers = [
      'Date',
      'Class',
      'Grade Level',
      'Student ID',
      'Student Name',
      'Status',
      'Marked By',
      'Remarks',
    ];

    const lines = [headers.join(',')];
    filteredReportRows.forEach((row) => {
      const markedBy = `${row.profiles?.first_name ?? ''} ${row.profiles?.last_name ?? ''}`.trim();
      const studentName = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim();

      lines.push(
        [
          row.date,
          row.classes?.name ?? '',
          row.classes?.grade_levels?.name ?? '',
          row.students?.student_id_number ?? '',
          studentName,
          row.status ?? '',
          markedBy,
          row.remarks ?? '',
        ]
          .map(escapeCsv)
          .join(',')
      );
    });

    const fileName = `attendance-report-${sanitizeFileName(reportClassLabel)}-${reportFromDate}-to-${reportToDate}.csv`;
    downloadTextFile(lines.join('\n'), fileName, 'text/csv;charset=utf-8;');
    toast.success('Attendance CSV exported');
  };

  const handleExportPdf = () => {
    if (filteredReportRows.length === 0) {
      toast.error('No report rows to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.text('Attendance Report', 14, 16);

    doc.setFontSize(10);
    doc.text(`Date range: ${reportFromDate} to ${reportToDate}`, 14, 23);
    doc.text(
      `Class filter: ${reportClassId === 'All' ? 'All classes' : reportClassLabel}`,
      14,
      29
    );
    doc.text(`Status filter: ${reportStatus}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      theme: 'grid',
      head: [['Date', 'Class', 'Student ID', 'Student', 'Status', 'Marked By', 'Remarks']],
      body: filteredReportRows.map((row) => [
        row.date ?? '-',
        row.classes?.name ?? '-',
        row.students?.student_id_number ?? '-',
        `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim() || '-',
        row.status ?? '-',
        `${row.profiles?.first_name ?? ''} ${row.profiles?.last_name ?? ''}`.trim() || '-',
        row.remarks ?? '-',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    const summaryStartY = (doc.lastAutoTable?.finalY ?? 42) + 8;
    autoTable(doc, {
      startY: summaryStartY,
      theme: 'striped',
      head: [['Class Summary', 'Records', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %']],
      body: classSummaries.map((row) => [
        row.gradeLevel ? `${row.className} (${row.gradeLevel})` : row.className,
        row.records,
        row.present,
        row.absent,
        row.late,
        row.excused,
        `${row.attendanceRate.toFixed(1)}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [17, 24, 39] },
    });

    const fileName = `attendance-report-${sanitizeFileName(reportClassLabel)}-${reportFromDate}-to-${reportToDate}.pdf`;
    doc.save(fileName);
    toast.success('Attendance PDF exported');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Admin overview and manual attendance marking"
        actions={
          <button
            onClick={handleSave}
            disabled={
              saveBatch.isPending ||
              !classId ||
              roster.length === 0 ||
              (isSelectedDateLocked && !adminOverrideEnabled) ||
              (isSelectedDateLocked && adminOverrideEnabled && !adminOverrideReason.trim())
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
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="input-base h-9 text-sm"
              disabled={classesLoading}
            >
              <option value="">Select class...</option>
              {classes.map((row) => (
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
              disabled={roster.length === 0 || !canEditSelectedDate}
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Present
            </button>
          </div>
        </div>
      </div>

      {isSelectedDateLocked ? (
        <div className="bg-status-warningBg rounded-xl border border-status-warning/30 p-4 space-y-3">
          <p className="text-sm text-status-warning">
            This date is outside the {ATTENDANCE_LOCK_WINDOW_HOURS}-hour edit window.
            Attendance is locked unless you use admin override.
          </p>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-status-warning cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-status-warning/40"
              checked={adminOverrideEnabled}
              onChange={(e) => setAdminOverrideEnabled(e.target.checked)}
            />
            Enable admin override for locked attendance edits
          </label>

          {adminOverrideEnabled ? (
            <div>
              <label className="block text-xs font-medium text-status-warning mb-1">Override reason (required)</label>
              <input
                value={adminOverrideReason}
                onChange={(e) => setAdminOverrideReason(e.target.value)}
                placeholder="Explain why this locked attendance needs to be edited"
                className="input-base h-9 text-sm bg-white"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="Total" value={stats.total} loading={rosterLoading || rowsLoading} />
        <StatCard title="Present" value={stats.present} color="bg-status-successBg text-status-success" loading={rosterLoading || rowsLoading} />
        <StatCard title="Absent" value={stats.absent} color="bg-status-dangerBg text-status-danger" loading={rosterLoading || rowsLoading} />
        <StatCard title="Late" value={stats.late} color="bg-status-warningBg text-status-warning" loading={rosterLoading || rowsLoading} />
        <StatCard title="Excused" value={stats.excused} color="bg-status-infoBg text-status-info" loading={rosterLoading || rowsLoading} />
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
              {!classId ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-text-muted">Select a class to begin attendance marking.</td>
                </tr>
              ) : rosterLoading || rowsLoading ? (
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
                                disabled={!canEditSelectedDate}
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
                          disabled={!canEditSelectedDate}
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

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Attendance Reports</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Analyze date ranges, review class summaries, and export CSV/PDF reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="btn-secondary text-sm h-9"
              disabled={reportLoading || filteredReportRows.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={handleExportPdf}
              className="btn-secondary text-sm h-9"
              disabled={reportLoading || filteredReportRows.length === 0}
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button onClick={handleClearReportFilters} className="btn-secondary text-sm h-9">
              <FilterX className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">From</label>
            <input
              type="date"
              value={reportFromDate}
              onChange={(e) => setReportFromDate(e.target.value)}
              className="input-base h-9 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">To</label>
            <input
              type="date"
              value={reportToDate}
              onChange={(e) => setReportToDate(e.target.value)}
              className="input-base h-9 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Class</label>
            <select
              value={reportClassId}
              onChange={(e) => setReportClassId(e.target.value)}
              className="input-base h-9 text-sm"
            >
              <option value="All">All Classes</option>
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}{row.grade_levels?.name ? ` (${row.grade_levels.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
            <select
              value={reportStatus}
              onChange={(e) => setReportStatus(e.target.value)}
              className="input-base h-9 text-sm"
            >
              {REPORT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Student, class, status..."
                className="input-base h-9 text-sm pl-9"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard title="Records" value={reportStats.records} loading={reportLoading} />
          <StatCard title="Students" value={reportStats.uniqueStudents} loading={reportLoading} />
          <StatCard title="Present" value={reportStats.present} color="bg-status-successBg text-status-success" loading={reportLoading} />
          <StatCard title="Absent" value={reportStats.absent} color="bg-status-dangerBg text-status-danger" loading={reportLoading} />
          <StatCard title="Attendance %" value={`${reportStats.attendanceRate.toFixed(1)}%`} loading={reportLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-surface-muted/40">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Class Summary</h3>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/20">
                    {['Class', 'Records', 'Present', 'Absent', 'Rate'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-text-muted">Loading summary...</td>
                    </tr>
                  ) : classSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-text-muted">No summary rows for the selected filters.</td>
                    </tr>
                  ) : (
                    classSummaries.map((row) => (
                      <tr key={`${row.className}-${row.gradeLevel}`}>
                        <td className="px-3 py-2 text-sm font-medium text-text-primary">
                          {row.className}
                          {row.gradeLevel ? <span className="text-xs text-text-muted ml-1">({row.gradeLevel})</span> : null}
                        </td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{row.records}</td>
                        <td className="px-3 py-2 text-sm text-status-success">{row.present}</td>
                        <td className="px-3 py-2 text-sm text-status-danger">{row.absent}</td>
                        <td className="px-3 py-2 text-sm text-text-secondary">{row.attendanceRate.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-surface-muted/40">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Detailed Rows</h3>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/20">
                    {['Date', 'Class', 'Student', 'Status'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-text-muted">Loading rows...</td>
                    </tr>
                  ) : filteredReportRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-text-muted">No attendance rows for the selected filters.</td>
                    </tr>
                  ) : (
                    filteredReportRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 text-sm text-text-secondary whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-2 text-sm text-text-secondary whitespace-nowrap">{row.classes?.name ?? '-'}</td>
                        <td className="px-3 py-2 text-sm text-text-primary">
                          {`${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim() || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-text-secondary whitespace-nowrap">{row.status ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <h2 className="text-sm font-semibold text-text-primary">Attendance TODO Roadmap</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Future features planned to evolve attendance into a full operational and analytics system.
        </p>
        <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 list-disc list-inside text-sm text-text-secondary">
          {ATTENDANCE_TODO_FEATURES.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
