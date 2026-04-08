import { useMemo, useState } from 'react';
import {
  FileText,
  Sparkles,
  Loader2,
  Search,
  Download,
  Trash2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import { useAcademicYears } from '../../../hooks/useSchool.js';
import {
  useDeleteReportCard,
  useGenerateReportCards,
  useReportCards,
} from '../../../hooks/useReportCards.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { formatDate, formatPosition } from '../../../utils/formatters.js';
import { getGrade, getGradeColor } from '../../../utils/gradeUtils.js';

const INITIAL_GENERATE_FORM = {
  classId: '',
  termId: '',
};

const sanitizeFileName = (value) => {
  const cleaned = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'report-card';
};

export default function ReportCardsPage() {
  const { schoolId } = useAuthContext();

  const [classFilter, setClassFilter] = useState('All');
  const [termFilter, setTermFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [generateForm, setGenerateForm] = useState(INITIAL_GENERATE_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: classesResult } = useClasses(schoolId);
  const { data: yearsResult } = useAcademicYears(schoolId);

  const { data: reportCardsResult, isLoading: reportCardsLoading } = useReportCards({
    schoolId,
    classId: classFilter !== 'All' ? classFilter : undefined,
    termId: termFilter !== 'All' ? termFilter : undefined,
  });

  const generateCards = useGenerateReportCards();
  const deleteReportCard = useDeleteReportCard();

  const classes = classesResult?.data ?? [];
  const reportCards = reportCardsResult?.data ?? [];

  const terms = useMemo(() => {
    const years = yearsResult?.data ?? [];
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
  }, [yearsResult]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reportCards;

    return reportCards.filter((row) => {
      const studentName = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`
        .trim()
        .toLowerCase();
      const studentId = (row.students?.student_id_number ?? '').toLowerCase();
      const className = (row.classes?.name ?? '').toLowerCase();
      const termName = (row.terms?.label ?? '').toLowerCase();
      const yearLabel = (row.academic_years?.label ?? '').toLowerCase();

      return (
        studentName.includes(query) ||
        studentId.includes(query) ||
        className.includes(query) ||
        termName.includes(query) ||
        yearLabel.includes(query)
      );
    });
  }, [reportCards, search]);

  const stats = useMemo(() => {
    const total = filteredCards.length;
    const promoted = filteredCards.filter((row) => !!row.is_promoted).length;

    const avgScore =
      total > 0
        ? filteredCards.reduce((sum, row) => sum + Number(row.average_score ?? 0), 0) / total
        : 0;

    const generatedToday = filteredCards.filter((row) => {
      if (!row.generated_at) return false;
      const d = new Date(row.generated_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;

    return {
      total,
      promoted,
      avgScore,
      generatedToday,
    };
  }, [filteredCards]);

  const handleGenerate = async () => {
    if (!generateForm.classId || !generateForm.termId) {
      toast.error('Select class and term before generating');
      return;
    }

    const result = await generateCards.mutateAsync({
      classId: generateForm.classId,
      termId: generateForm.termId,
    });

    if ((result?.data?.length ?? 0) === 0) {
      toast('No active students found for this class.');
    }

    setClassFilter(generateForm.classId);
    setTermFilter(generateForm.termId);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteReportCard.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleDownload = (row) => {
    const studentName = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim() || 'Student';
    const className = row.classes?.name ?? 'N/A';
    const termLabel = row.terms?.label ?? 'N/A';
    const yearLabel = row.academic_years?.label ?? 'N/A';

    const averageScore = Number(row.average_score ?? 0);
    const totalScore = Number(row.total_score ?? 0);
    const gradeInfo = getGrade(averageScore, 'ghana_basic');

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('EduNexus Student Report Card', 14, 18);

    doc.setFontSize(11);
    doc.text(`Student: ${studentName}`, 14, 30);
    doc.text(`Student ID: ${row.students?.student_id_number ?? 'N/A'}`, 14, 36);
    doc.text(`Class: ${className}`, 14, 42);
    doc.text(`Term: ${termLabel}`, 14, 48);
    doc.text(`Academic Year: ${yearLabel}`, 14, 54);

    autoTable(doc, {
      startY: 62,
      theme: 'grid',
      head: [['Metric', 'Value']],
      body: [
        ['Average Score', `${averageScore.toFixed(2)}%`],
        ['Total Score', `${totalScore.toFixed(2)}`],
        ['Grade', gradeInfo.grade],
        ['Remark', gradeInfo.remark],
        ['Position', formatPosition(row.position_in_class, row.position_out_of)],
        ['Promoted', row.is_promoted ? 'Yes' : 'No'],
        ['Generated', formatDate(row.generated_at)],
      ],
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 10 },
    });

    const fileName = `${sanitizeFileName(studentName)}-${sanitizeFileName(termLabel)}-report-card.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        subtitle="Generate and manage class term report cards"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Cards"
          value={reportCardsLoading ? null : stats.total}
          icon={FileText}
          color="bg-brand-50 text-brand-600"
          loading={reportCardsLoading}
        />
        <StatCard
          title="Promoted"
          value={reportCardsLoading ? null : stats.promoted}
          icon={Sparkles}
          color="bg-status-successBg text-status-success"
          loading={reportCardsLoading}
        />
        <StatCard
          title="Average %"
          value={reportCardsLoading ? null : stats.avgScore.toFixed(2)}
          icon={FileText}
          color="bg-blue-50 text-blue-600"
          loading={reportCardsLoading}
        />
        <StatCard
          title="Generated Today"
          value={reportCardsLoading ? null : stats.generatedToday}
          icon={Sparkles}
          color="bg-purple-50 text-purple-600"
          loading={reportCardsLoading}
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Generate Report Cards</h2>
          <p className="text-xs text-text-muted">Re-running generation updates existing cards for the selected class and term.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Class</label>
            <select
              value={generateForm.classId}
              onChange={(e) =>
                setGenerateForm((prev) => ({ ...prev, classId: e.target.value }))
              }
              className="input-base h-9 text-sm"
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
            <label className="block text-xs font-medium text-text-secondary mb-1">Term</label>
            <select
              value={generateForm.termId}
              onChange={(e) =>
                setGenerateForm((prev) => ({ ...prev, termId: e.target.value }))
              }
              className="input-base h-9 text-sm"
            >
              <option value="">Select term...</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label} ({term.academic_year_label})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end justify-end">
            <button
              onClick={handleGenerate}
              className="btn-primary text-sm h-9"
              disabled={generateCards.isPending}
            >
              {generateCards.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Report Cards
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, ID, class, term..."
              className="input-base h-9 pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-white text-text-primary h-9"
            >
              <option value="All">All Classes</option>
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-secondary">Term</label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-white text-text-primary h-9"
            >
              <option value="All">All Terms</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40">
                {['Student', 'Class', 'Term', 'Average', 'Position', 'Promotion', 'Generated', ''].map((h) => (
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
              {reportCardsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className="h-4 bg-surface-hover rounded"
                          style={{ width: `${42 + ((i + j) * 8) % 45}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-text-muted">
                    No report cards found for current filters.
                  </td>
                </tr>
              ) : (
                filteredCards.map((row) => {
                  const grade = getGrade(Number(row.average_score ?? 0), 'ghana_basic');
                  const gradeColor = getGradeColor(grade.remark);

                  return (
                    <tr key={row.id} className="hover:bg-surface-muted/30 transition-colors group/row">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">
                          {row.students?.first_name} {row.students?.last_name}
                        </p>
                        <p className="text-xs text-text-muted font-mono mt-0.5">
                          {row.students?.student_id_number || 'No ID'}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-text-secondary">
                        {row.classes?.name}
                        {row.classes?.grade_levels?.name ? ` (${row.classes.grade_levels.name})` : ''}
                      </td>

                      <td className="px-4 py-3 text-text-secondary">
                        {row.terms?.label}
                        {row.academic_years?.label ? ` - ${row.academic_years.label}` : ''}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-text-primary">{Number(row.average_score ?? 0).toFixed(2)}%</p>
                        <p className={`text-xs mt-0.5 ${gradeColor}`}>
                          Grade {grade.grade} ({grade.remark})
                        </p>
                      </td>

                      <td className="px-4 py-3 text-text-secondary">
                        {formatPosition(row.position_in_class, row.position_out_of)}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={row.is_promoted ? 'Approved' : 'Pending'} dot />
                      </td>

                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(row.generated_at)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownload(row)}
                            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-brand-600 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 rounded-lg hover:bg-status-dangerBg text-text-muted hover:text-status-danger transition-colors"
                            title="Delete"
                          >
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
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteReportCard.isPending}
        title={`Delete report card for ${deleteTarget?.students?.first_name || 'student'}?`}
        message="This permanently removes the generated report card record."
        confirmLabel="Delete Report Card"
      />
    </div>
  );
}
