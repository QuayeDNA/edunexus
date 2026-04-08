import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  ClipboardCheck,
  GraduationCap,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import { useAcademicYears } from '../../../hooks/useSchool.js';
import { useTimetableAssignments } from '../../../hooks/useTimetable.js';
import {
  useAssessmentRoster,
  useAssessments,
  useAssessmentScores,
  useAssessmentTypes,
  useCreateAssessment,
  useCreateAssessmentType,
  useDeleteAssessment,
  useDeleteAssessmentType,
  useSaveAssessmentScoresBatch,
  useUpdateAssessmentType,
} from '../../../hooks/useAssessments.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import { formatDate } from '../../../utils/formatters.js';

const DEFAULT_TYPE_FORM = {
  name: '',
  weight_percentage: '',
  grading_system: 'ghana_basic',
};

const DEFAULT_ASSESSMENT_FORM = {
  class_subject_id: '',
  assessment_type_id: '',
  term_id: '',
  title: '',
  total_marks: 100,
  date: new Date().toISOString().slice(0, 10),
};

export default function AssessmentsPage() {
  const { schoolId, user } = useAuthContext();

  const [classFilter, setClassFilter] = useState('All');
  const [termFilter, setTermFilter] = useState('All');

  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeForm, setTypeForm] = useState(DEFAULT_TYPE_FORM);
  const [editingTypeId, setEditingTypeId] = useState(null);

  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState(DEFAULT_ASSESSMENT_FORM);

  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);

  const [deleteAssessmentTypeTarget, setDeleteAssessmentTypeTarget] = useState(null);
  const [deleteAssessmentTarget, setDeleteAssessmentTarget] = useState(null);

  const [scoreDrafts, setScoreDrafts] = useState({});

  const { data: classesResult } = useClasses(schoolId);
  const { data: academicYearsResult } = useAcademicYears(schoolId);
  const { data: assignmentResult } = useTimetableAssignments({
    schoolId,
    classId: classFilter !== 'All' ? classFilter : undefined,
  });

  const { data: typeResult, isLoading: typeLoading } = useAssessmentTypes({ schoolId });
  const { data: assessmentsResult, isLoading: assessmentsLoading } = useAssessments({
    schoolId,
    classId: classFilter !== 'All' ? classFilter : undefined,
    termId: termFilter !== 'All' ? termFilter : undefined,
  });

  const createAssessmentType = useCreateAssessmentType();
  const updateAssessmentType = useUpdateAssessmentType();
  const deleteAssessmentType = useDeleteAssessmentType();
  const createAssessment = useCreateAssessment();
  const deleteAssessment = useDeleteAssessment();
  const saveScoresBatch = useSaveAssessmentScoresBatch();

  const classes = classesResult?.data ?? [];
  const assessmentTypes = typeResult?.data ?? [];
  const assessments = assessmentsResult?.data ?? [];
  const classSubjectAssignments = assignmentResult?.data ?? [];

  const terms = useMemo(() => {
    const years = academicYearsResult?.data ?? [];
    return years
      .flatMap((year) =>
        (year.terms ?? []).map((term) => ({
          ...term,
          academic_year_label: year.label,
        }))
      )
      .sort((a, b) => {
        const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
        const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
        return bDate - aDate;
      });
  }, [academicYearsResult]);

  const selectedAssessment = useMemo(
    () => assessments.find((row) => row.id === selectedAssessmentId) ?? null,
    [assessments, selectedAssessmentId]
  );

  const selectedClassIdForScores = selectedAssessment?.class_subjects?.class_id ?? null;

  const { data: scoreRows = [] } = useAssessmentScores(selectedAssessmentId);
  const { data: roster = [], isLoading: rosterLoading } = useAssessmentRoster(selectedClassIdForScores);

  const scoreRowByStudentId = useMemo(() => {
    const map = {};
    scoreRows.forEach((row) => {
      if (!map[row.student_id]) map[row.student_id] = row;
    });
    return map;
  }, [scoreRows]);

  useEffect(() => {
    if (!selectedAssessmentId || roster.length === 0) {
      setScoreDrafts({});
      return;
    }

    const nextDrafts = {};
    roster.forEach((student) => {
      const existing = scoreRowByStudentId[student.id];
      nextDrafts[student.id] = {
        score: existing?.score ?? '',
        remarks: existing?.remarks ?? '',
        is_absent: !!existing?.is_absent,
      };
    });
    setScoreDrafts(nextDrafts);
  }, [selectedAssessmentId, roster, scoreRowByStudentId]);

  const assessmentTypeCountById = useMemo(() => {
    const map = {};
    assessments.forEach((row) => {
      map[row.assessment_type_id] = (map[row.assessment_type_id] ?? 0) + 1;
    });
    return map;
  }, [assessments]);

  const stats = useMemo(() => {
    const totalAssessments = assessments.length;
    const totalTypes = assessmentTypes.length;
    const totalScores = scoreRows.length;

    return {
      totalAssessments,
      totalTypes,
      totalScores,
      classesCovered: new Set(
        assessments
          .map((row) => row.class_subjects?.class_id)
          .filter(Boolean)
      ).size,
    };
  }, [assessments, assessmentTypes, scoreRows]);

  const assignmentsForForm = useMemo(() => {
    if (classFilter === 'All') return classSubjectAssignments;
    return classSubjectAssignments.filter((row) => row.class_id === classFilter);
  }, [classSubjectAssignments, classFilter]);

  const avgScoreInfo = useMemo(() => {
    if (!roster.length) return { avg: 0, entered: 0 };

    let sum = 0;
    let entered = 0;

    roster.forEach((student) => {
      const draft = scoreDrafts[student.id];
      if (!draft || draft.is_absent) return;
      const value = draft.score === '' ? null : Number(draft.score);
      if (value === null || Number.isNaN(value)) return;
      sum += value;
      entered += 1;
    });

    return {
      avg: entered > 0 ? sum / entered : 0,
      entered,
    };
  }, [roster, scoreDrafts]);

  const startCreateType = () => {
    setEditingTypeId(null);
    setTypeForm(DEFAULT_TYPE_FORM);
    setShowTypeForm(true);
  };

  const startEditType = (typeRow) => {
    setEditingTypeId(typeRow.id);
    setTypeForm({
      name: typeRow.name ?? '',
      weight_percentage:
        typeRow.weight_percentage === null || typeof typeRow.weight_percentage === 'undefined'
          ? ''
          : typeRow.weight_percentage,
      grading_system: typeRow.grading_system ?? 'ghana_basic',
    });
    setShowTypeForm(true);
  };

  const resetTypeForm = () => {
    setEditingTypeId(null);
    setTypeForm(DEFAULT_TYPE_FORM);
    setShowTypeForm(false);
  };

  const handleSaveType = async (e) => {
    e.preventDefault();

    if (!typeForm.name.trim()) {
      toast.error('Assessment type name is required');
      return;
    }

    const weight =
      typeForm.weight_percentage === ''
        ? null
        : Number(typeForm.weight_percentage);
    if (weight !== null && (Number.isNaN(weight) || weight < 0 || weight > 100)) {
      toast.error('Weight must be between 0 and 100');
      return;
    }

    const payload = {
      school_id: schoolId,
      name: typeForm.name.trim(),
      weight_percentage: weight,
      grading_system: typeForm.grading_system || null,
    };

    if (editingTypeId) {
      await updateAssessmentType.mutateAsync({ id: editingTypeId, data: payload });
    } else {
      await createAssessmentType.mutateAsync(payload);
    }

    resetTypeForm();
  };

  const handleDeleteType = async () => {
    if (!deleteAssessmentTypeTarget) return;

    if ((assessmentTypeCountById[deleteAssessmentTypeTarget.id] ?? 0) > 0) {
      toast.error('This type is used by existing assessments');
      setDeleteAssessmentTypeTarget(null);
      return;
    }

    await deleteAssessmentType.mutateAsync(deleteAssessmentTypeTarget.id);
    setDeleteAssessmentTypeTarget(null);
  };

  const resetAssessmentForm = () => {
    setAssessmentForm({
      ...DEFAULT_ASSESSMENT_FORM,
      term_id: terms[0]?.id ?? '',
    });
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();

    if (!assessmentForm.class_subject_id || !assessmentForm.assessment_type_id || !assessmentForm.term_id) {
      toast.error('Class subject, assessment type, and term are required');
      return;
    }
    if (!assessmentForm.title.trim()) {
      toast.error('Assessment title is required');
      return;
    }

    const totalMarks = Number(assessmentForm.total_marks);
    if (Number.isNaN(totalMarks) || totalMarks <= 0) {
      toast.error('Total marks must be greater than 0');
      return;
    }

    const payload = {
      class_subject_id: assessmentForm.class_subject_id,
      assessment_type_id: assessmentForm.assessment_type_id,
      term_id: assessmentForm.term_id,
      title: assessmentForm.title.trim(),
      total_marks: totalMarks,
      date: assessmentForm.date || null,
      created_by: user?.id ?? null,
    };

    const created = await createAssessment.mutateAsync(payload);
    setShowAssessmentForm(false);
    resetAssessmentForm();
    setSelectedAssessmentId(created.id);
  };

  const handleDeleteAssessment = async () => {
    if (!deleteAssessmentTarget) return;
    await deleteAssessment.mutateAsync(deleteAssessmentTarget.id);

    if (selectedAssessmentId === deleteAssessmentTarget.id) {
      setSelectedAssessmentId(null);
      setScoreDrafts({});
    }

    setDeleteAssessmentTarget(null);
  };

  const updateScoreDraft = (studentId, field, value) => {
    setScoreDrafts((prev) => {
      const current = prev[studentId] ?? {
        score: '',
        remarks: '',
        is_absent: false,
      };

      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'is_absent' && value) {
        next.score = '';
      }

      return {
        ...prev,
        [studentId]: next,
      };
    });
  };

  const handleSaveScores = async () => {
    if (!selectedAssessment) return;

    const max = Number(selectedAssessment.total_marks || 0);

    const rows = roster.map((student) => {
      const draft = scoreDrafts[student.id] ?? {
        score: '',
        remarks: '',
        is_absent: false,
      };

      const numericScore =
        draft.is_absent || draft.score === '' || draft.score === null
          ? null
          : Number(draft.score);

      return {
        assessment_id: selectedAssessment.id,
        student_id: student.id,
        score: numericScore,
        remarks: draft.remarks,
        is_absent: !!draft.is_absent,
      };
    });

    for (const row of rows) {
      if (row.score === null) continue;
      if (Number.isNaN(row.score) || row.score < 0 || row.score > max) {
        toast.error(`Scores must be between 0 and ${max}`);
        return;
      }
    }

    await saveScoresBatch.mutateAsync({ assessmentId: selectedAssessment.id, rows });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        subtitle="Manage assessments and enter scores"
        actions={
          <button
            onClick={() => {
              setShowAssessmentForm((prev) => !prev);
              if (!showAssessmentForm) resetAssessmentForm();
            }}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            {showAssessmentForm ? 'Close Form' : 'Create Assessment'}
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Assessments" value={assessmentsLoading ? null : stats.totalAssessments} icon={ClipboardCheck} color="bg-brand-50 text-brand-600" loading={assessmentsLoading} />
        <StatCard title="Assessment Types" value={typeLoading ? null : stats.totalTypes} icon={BookOpen} color="bg-blue-50 text-blue-600" loading={typeLoading} />
        <StatCard title="Classes Covered" value={assessmentsLoading ? null : stats.classesCovered} icon={GraduationCap} color="bg-purple-50 text-purple-600" loading={assessmentsLoading} />
        <StatCard title="Scores Entered" value={selectedAssessmentId ? stats.totalScores : 0} icon={Save} color="bg-status-successBg text-status-success" loading={false} />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Assessment Types</h2>
            <p className="text-xs text-text-muted mt-0.5">Define type and weight configuration used by assessments.</p>
          </div>
          <button onClick={startCreateType} className="btn-secondary text-xs h-8">
            <Plus className="w-3.5 h-3.5" />
            Add Type
          </button>
        </div>

        {showTypeForm && (
          <form onSubmit={handleSaveType} className="p-4 border-b border-border bg-surface-muted/40">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
                <input
                  value={typeForm.name}
                  onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-base h-9 text-sm"
                  placeholder="Class Exercise"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Weight %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={typeForm.weight_percentage}
                  onChange={(e) =>
                    setTypeForm((prev) => ({ ...prev, weight_percentage: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                  placeholder="20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Grading System</label>
                <select
                  value={typeForm.grading_system}
                  onChange={(e) =>
                    setTypeForm((prev) => ({ ...prev, grading_system: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                >
                  <option value="ghana_basic">Ghana Basic</option>
                  <option value="ghana_wassce">Ghana WASSCE</option>
                  <option value="british_gcse">British GCSE</option>
                  <option value="american_gpa">American GPA</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="btn-primary text-xs h-9"
                  disabled={createAssessmentType.isPending || updateAssessmentType.isPending}
                >
                  {(createAssessmentType.isPending || updateAssessmentType.isPending) ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>{editingTypeId ? 'Update' : 'Create'}</>
                  )}
                </button>
                <button type="button" onClick={resetTypeForm} className="btn-secondary text-xs h-9">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {['Name', 'Weight', 'Grading', 'Used In', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {typeLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-surface-hover rounded" style={{ width: `${45 + ((i + j) * 9) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : assessmentTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-text-muted">No assessment types configured yet.</td>
                </tr>
              ) : (
                assessmentTypes.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted/30 transition-colors group/row">
                    <td className="px-4 py-3 font-medium text-text-primary">{row.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.weight_percentage ?? '—'}%</td>
                    <td className="px-4 py-3 text-text-secondary">{row.grading_system || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{assessmentTypeCountById[row.id] ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button onClick={() => startEditType(row)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteAssessmentTypeTarget(row)} className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors" title="Delete">
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
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary">Class</label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="text-sm border border-border rounded-md px-2 py-1.5 bg-white text-text-primary h-9">
              <option value="All">All Classes</option>
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}{row.grade_levels?.name ? ` (${row.grade_levels.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary">Term</label>
            <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} className="text-sm border border-border rounded-md px-2 py-1.5 bg-white text-text-primary h-9">
              <option value="All">All Terms</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label} ({term.academic_year_label})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-text-muted ml-auto">{assessments.length} assessments</span>
        </div>

        {showAssessmentForm && (
          <form onSubmit={handleSaveAssessment} className="p-4 border-b border-border bg-surface-muted/40">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Class Subject</label>
                <select
                  value={assessmentForm.class_subject_id}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({ ...prev, class_subject_id: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                >
                  <option value="">Select assignment...</option>
                  {assignmentsForForm.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.classes?.name}
                      {row.classes?.grade_levels?.name ? ` (${row.classes.grade_levels.name})` : ''}
                      {' - '}
                      {row.subjects?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                <select
                  value={assessmentForm.assessment_type_id}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({ ...prev, assessment_type_id: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                >
                  <option value="">Select type...</option>
                  {assessmentTypes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Term</label>
                <select
                  value={assessmentForm.term_id}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({ ...prev, term_id: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                >
                  <option value="">Select term...</option>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Total Marks</label>
                <input
                  type="number"
                  min="1"
                  value={assessmentForm.total_marks}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({ ...prev, total_marks: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
                <input
                  type="date"
                  value={assessmentForm.date}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="input-base h-9 text-sm"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
                <input
                  value={assessmentForm.title}
                  onChange={(e) =>
                    setAssessmentForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Mid-Term Mathematics Test"
                  className="input-base h-9 text-sm"
                />
              </div>

              <div className="md:col-span-2 flex items-end justify-end gap-2">
                <button type="button" onClick={() => setShowAssessmentForm(false)} className="btn-secondary text-xs h-9">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs h-9" disabled={createAssessment.isPending}>
                  {createAssessment.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create Assessment
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
                {['Title', 'Class', 'Subject', 'Type', 'Term', 'Date', 'Marks', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assessmentsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-surface-hover rounded" style={{ width: `${42 + ((i + j) * 7) % 45}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-text-muted">No assessments found for current filters.</td>
                </tr>
              ) : (
                assessments.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted/30 transition-colors group/row">
                    <td className="px-4 py-3 font-medium text-text-primary">{row.title}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {row.class_subjects?.classes?.name}
                      {row.class_subjects?.classes?.grade_levels?.name
                        ? ` (${row.class_subjects.classes.grade_levels.name})`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{row.class_subjects?.subjects?.name || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.assessment_types?.name || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.terms?.label || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.total_marks}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={selectedAssessmentId === row.id ? 'Active' : 'Draft'} dot />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedAssessmentId(row.id)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors" title="Score Entry">
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteAssessmentTarget(row)} className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors" title="Delete">
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

      {selectedAssessment && (
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Score Entry · {selectedAssessment.title}</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {selectedAssessment.class_subjects?.classes?.name}
                {' · '}
                {selectedAssessment.class_subjects?.subjects?.name}
                {' · Max '}
                {selectedAssessment.total_marks}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Average</p>
              <p className="text-sm font-semibold text-text-primary">
                {avgScoreInfo.entered > 0 ? avgScoreInfo.avg.toFixed(2) : '—'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40">
                  {['Student', 'Student ID', 'Score', 'Absent', 'Remarks'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rosterLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-surface-hover rounded" style={{ width: `${42 + ((i + j) * 8) % 45}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-text-muted">No active students found in this class.</td>
                  </tr>
                ) : (
                  roster.map((student) => {
                    const draft = scoreDrafts[student.id] ?? {
                      score: '',
                      remarks: '',
                      is_absent: false,
                    };

                    return (
                      <tr key={student.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">{student.first_name} {student.last_name}</td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">{student.student_id_number || '—'}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={selectedAssessment.total_marks}
                            step="0.01"
                            value={draft.score}
                            onChange={(e) => updateScoreDraft(student.id, 'score', e.target.value)}
                            disabled={draft.is_absent}
                            className="input-base h-8 text-sm w-28 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                            <input
                              type="checkbox"
                              checked={draft.is_absent}
                              onChange={(e) => updateScoreDraft(student.id, 'is_absent', e.target.checked)}
                              className="rounded border-border"
                            />
                            Absent
                          </label>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={draft.remarks}
                            onChange={(e) => updateScoreDraft(student.id, 'remarks', e.target.value)}
                            placeholder="Optional remark"
                            className="input-base h-8 text-sm"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-border flex justify-end">
            <button onClick={handleSaveScores} className="btn-primary text-xs h-9" disabled={saveScoresBatch.isPending || roster.length === 0}>
              {saveScoresBatch.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Scores...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Scores
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteAssessmentTypeTarget}
        onClose={() => setDeleteAssessmentTypeTarget(null)}
        onConfirm={handleDeleteType}
        loading={deleteAssessmentType.isPending}
        title={`Delete ${deleteAssessmentTypeTarget?.name || 'assessment type'}?`}
        message="This permanently removes the assessment type if it is not in use."
        confirmLabel="Delete Type"
      />

      <ConfirmDialog
        open={!!deleteAssessmentTarget}
        onClose={() => setDeleteAssessmentTarget(null)}
        onConfirm={handleDeleteAssessment}
        loading={deleteAssessment.isPending}
        title={`Delete ${deleteAssessmentTarget?.title || 'assessment'}?`}
        message="This removes the assessment and related score records."
        confirmLabel="Delete Assessment"
      />
    </div>
  );
}
