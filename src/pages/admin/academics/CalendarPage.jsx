import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Flag,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useCreateTerm,
  useDeleteAcademicYear,
  useDeleteTerm,
  useSetCurrentAcademicYear,
  useSetCurrentTerm,
} from '../../../hooks/useSchool.js';
import { formatDate } from '../../../utils/formatters.js';

const EMPTY_YEAR_FORM = {
  label: '',
  start_date: '',
  end_date: '',
  is_current: false,
};

const EMPTY_TERM_FORM = {
  academic_year_id: '',
  label: '',
  term_number: 1,
  start_date: '',
  end_date: '',
  is_current: false,
};

const CALENDAR_TODO_FEATURES = [
  'Holiday and exam timeline overlays inside term views',
  'Conflict checks between term dates and attendance lock windows',
  'School event import from ICS and Google Calendar feeds',
  'Automatic term rollover and archive process with approval step',
];

export default function AcademicCalendarPage() {
  const { schoolId } = useAuthContext();

  const [showYearForm, setShowYearForm] = useState(false);
  const [showTermForm, setShowTermForm] = useState(false);
  const [yearForm, setYearForm] = useState(EMPTY_YEAR_FORM);
  const [termForm, setTermForm] = useState(EMPTY_TERM_FORM);

  const [deleteYearTarget, setDeleteYearTarget] = useState(null);
  const [deleteTermTarget, setDeleteTermTarget] = useState(null);

  const { data: yearsResult, isLoading } = useAcademicYears(schoolId);
  const createYear = useCreateAcademicYear();
  const deleteYear = useDeleteAcademicYear();
  const setCurrentYear = useSetCurrentAcademicYear();
  const createTerm = useCreateTerm();
  const deleteTerm = useDeleteTerm();
  const setCurrentTerm = useSetCurrentTerm();

  const academicYears = yearsResult?.data ?? [];

  const allTerms = useMemo(
    () =>
      academicYears
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
        }),
    [academicYears]
  );

  const currentAcademicYear = useMemo(
    () => academicYears.find((row) => row.is_current) ?? null,
    [academicYears]
  );

  const currentTerm = useMemo(
    () => allTerms.find((row) => row.is_current) ?? null,
    [allTerms]
  );

  const stats = useMemo(
    () => ({
      years: academicYears.length,
      terms: allTerms.length,
      currentYear: currentAcademicYear?.label ?? 'Not set',
      currentTerm: currentTerm?.label ?? 'Not set',
    }),
    [academicYears, allTerms, currentAcademicYear, currentTerm]
  );

  const handleCreateYear = async () => {
    if (!yearForm.label.trim() || !yearForm.start_date || !yearForm.end_date) {
      toast.error('Complete all academic year fields');
      return;
    }

    if (yearForm.start_date > yearForm.end_date) {
      toast.error('Academic year start date must be before end date');
      return;
    }

    const created = await createYear.mutateAsync({
      school_id: schoolId,
      label: yearForm.label.trim(),
      start_date: yearForm.start_date,
      end_date: yearForm.end_date,
      is_current: false,
    });

    if (yearForm.is_current && created?.id) {
      await setCurrentYear.mutateAsync({ id: created.id, schoolId });
    }

    setYearForm(EMPTY_YEAR_FORM);
    setShowYearForm(false);
  };

  const handleCreateTerm = async () => {
    if (
      !termForm.academic_year_id ||
      !termForm.label.trim() ||
      !termForm.start_date ||
      !termForm.end_date
    ) {
      toast.error('Complete all term fields');
      return;
    }

    if (termForm.start_date > termForm.end_date) {
      toast.error('Term start date must be before end date');
      return;
    }

    const created = await createTerm.mutateAsync({
      school_id: schoolId,
      academic_year_id: termForm.academic_year_id,
      label: termForm.label.trim(),
      term_number: Number(termForm.term_number) || 1,
      start_date: termForm.start_date,
      end_date: termForm.end_date,
      is_current: false,
    });

    if (termForm.is_current && created?.id) {
      await setCurrentTerm.mutateAsync({ id: created.id, schoolId });
    }

    setTermForm(EMPTY_TERM_FORM);
    setShowTermForm(false);
  };

  const handleDeleteYear = async () => {
    if (!deleteYearTarget) return;
    await deleteYear.mutateAsync({ id: deleteYearTarget.id, schoolId });
    setDeleteYearTarget(null);
  };

  const handleDeleteTerm = async () => {
    if (!deleteTermTarget) return;
    await deleteTerm.mutateAsync({ id: deleteTermTarget.id, schoolId });
    setDeleteTermTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Calendar"
        subtitle="Manage academic years, terms, and current active periods"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowYearForm((prev) => !prev)}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4" />
              {showYearForm ? 'Close Year Form' : 'Add Academic Year'}
            </button>
            <button
              onClick={() => setShowTermForm((prev) => !prev)}
              className="btn-primary text-sm"
            >
              <CalendarDays className="w-4 h-4" />
              {showTermForm ? 'Close Term Form' : 'Add Term'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Academic Years" value={stats.years} loading={isLoading} />
        <StatCard title="Terms" value={stats.terms} loading={isLoading} />
        <StatCard title="Current Year" value={stats.currentYear} loading={isLoading} />
        <StatCard title="Current Term" value={stats.currentTerm} loading={isLoading} />
      </div>

      {showYearForm ? (
        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Create Academic Year</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Label</label>
              <input
                value={yearForm.label}
                onChange={(e) => setYearForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="2026/2027"
                className="input-base h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
              <input
                type="date"
                value={yearForm.start_date}
                onChange={(e) => setYearForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">End Date</label>
              <input
                type="date"
                value={yearForm.end_date}
                onChange={(e) => setYearForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={yearForm.is_current}
                  onChange={(e) =>
                    setYearForm((prev) => ({ ...prev, is_current: e.target.checked }))
                  }
                />
                Set as current
              </label>
              <button
                onClick={handleCreateYear}
                disabled={createYear.isPending || setCurrentYear.isPending}
                className="btn-primary text-sm h-9 ml-auto"
              >
                {createYear.isPending || setCurrentYear.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Save Year
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTermForm ? (
        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Create Term</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Academic Year</label>
              <select
                value={termForm.academic_year_id}
                onChange={(e) =>
                  setTermForm((prev) => ({ ...prev, academic_year_id: e.target.value }))
                }
                className="input-base h-9 text-sm"
              >
                <option value="">Select year...</option>
                {academicYears.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Label</label>
              <input
                value={termForm.label}
                onChange={(e) => setTermForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Term 1"
                className="input-base h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Term Number</label>
              <input
                type="number"
                min={1}
                value={termForm.term_number}
                onChange={(e) => setTermForm((prev) => ({ ...prev, term_number: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
              <input
                type="date"
                value={termForm.start_date}
                onChange={(e) => setTermForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">End Date</label>
              <input
                type="date"
                value={termForm.end_date}
                onChange={(e) => setTermForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={termForm.is_current}
                  onChange={(e) =>
                    setTermForm((prev) => ({ ...prev, is_current: e.target.checked }))
                  }
                />
                Set current
              </label>
              <button
                onClick={handleCreateTerm}
                disabled={createTerm.isPending || setCurrentTerm.isPending}
                className="btn-primary text-sm h-9 ml-auto"
              >
                {createTerm.isPending || setCurrentTerm.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Save Term
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface-muted/40">
            <h2 className="text-sm font-semibold text-text-primary">Academic Years</h2>
          </div>
          <div className="divide-y divide-border">
            {academicYears.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-text-muted">
                No academic years yet.
              </div>
            ) : (
              academicYears.map((year) => (
                <div key={year.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{year.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatDate(year.start_date)} - {formatDate(year.end_date)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Terms: {year.terms?.length ?? 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {year.is_current ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-status-success/30 bg-status-successBg text-status-success">
                        <CheckCircle2 className="w-3 h-3" /> Current
                      </span>
                    ) : (
                      <button
                        onClick={() => setCurrentYear.mutateAsync({ id: year.id, schoolId })}
                        className="btn-secondary text-xs h-8"
                        disabled={setCurrentYear.isPending}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Set Current
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteYearTarget(year)}
                      className="p-2 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-dangerBg transition-colors"
                      title="Delete academic year"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface-muted/40">
            <h2 className="text-sm font-semibold text-text-primary">Terms</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/20">
                  {['Term', 'Year', 'Dates', 'Status', 'Actions'].map((head) => (
                    <th
                      key={head}
                      className="px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allTerms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-text-muted">
                      No terms yet.
                    </td>
                  </tr>
                ) : (
                  allTerms.map((term) => (
                    <tr key={term.id}>
                      <td className="px-3 py-2 text-sm text-text-primary font-medium whitespace-nowrap">
                        {term.label} {term.term_number ? `(T${term.term_number})` : ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-text-secondary whitespace-nowrap">
                        {term.academic_year_label}
                      </td>
                      <td className="px-3 py-2 text-sm text-text-secondary whitespace-nowrap">
                        {formatDate(term.start_date)} - {formatDate(term.end_date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {term.is_current ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-status-success/30 bg-status-successBg text-status-success">
                            <CheckCircle2 className="w-3 h-3" /> Current
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded border border-border text-text-muted">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {!term.is_current ? (
                            <button
                              onClick={() => setCurrentTerm.mutateAsync({ id: term.id, schoolId })}
                              className="btn-secondary text-xs h-8"
                              disabled={setCurrentTerm.isPending}
                            >
                              <Flag className="w-3.5 h-3.5" />
                              Set Current
                            </button>
                          ) : null}

                          <button
                            onClick={() => setDeleteTermTarget(term)}
                            className="p-2 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-dangerBg transition-colors"
                            title="Delete term"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <h2 className="text-sm font-semibold text-text-primary">Academic Calendar TODO Roadmap</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Future enhancements queued for calendar operations in later phases.
        </p>
        <ul className="mt-3 space-y-1 list-disc list-inside text-sm text-text-secondary">
          {CALENDAR_TODO_FEATURES.map((todo) => (
            <li key={todo}>{todo}</li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={!!deleteYearTarget}
        onClose={() => setDeleteYearTarget(null)}
        onConfirm={handleDeleteYear}
        title="Delete academic year?"
        message={`This will remove ${deleteYearTarget?.label ?? 'this year'} and linked terms. This action cannot be undone.`}
        confirmLabel="Delete Year"
        loading={deleteYear.isPending}
      />

      <ConfirmDialog
        open={!!deleteTermTarget}
        onClose={() => setDeleteTermTarget(null)}
        onConfirm={handleDeleteTerm}
        title="Delete term?"
        message={`This will remove ${deleteTermTarget?.label ?? 'this term'}. This action cannot be undone.`}
        confirmLabel="Delete Term"
        loading={deleteTerm.isPending}
      />
    </div>
  );
}
