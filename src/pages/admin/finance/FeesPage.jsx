import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CreditCard,
  FilterX,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import { useAcademicYears } from '../../../hooks/useSchool.js';
import {
  useCreateFeeCategory,
  useCreateFeeSchedule,
  useDeleteFeeCategory,
  useDeleteFeeSchedule,
  useFeeCategories,
  useFeeSchedules,
  useFinanceSummary,
  useGenerateStudentFees,
  useStudentFees,
} from '../../../hooks/useFinance.js';
import { useSchoolStore } from '../../../store/schoolStore.js';
import { formatDate, formatGHS } from '../../../utils/formatters.js';

const EMPTY_CATEGORY_FORM = {
  name: '',
  description: '',
  is_recurring: true,
};

const EMPTY_SCHEDULE_FORM = {
  fee_category_id: '',
  grade_level_id: '',
  term_id: '',
  amount: '',
  due_date: '',
  is_mandatory: true,
};

const STATUS_OPTIONS = ['All', 'Paid', 'Partial', 'Unpaid', 'Waived', 'Overdue'];

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const getFeeStatusWithDue = (row, todayIso) => {
  if (!row) return 'Unpaid';
  if ((row.status === 'Unpaid' || row.status === 'Partial') && row.due_date && row.due_date < todayIso) {
    return 'Overdue';
  }
  return row.status ?? 'Unpaid';
};

export default function FeesBillingPage() {
  const { schoolId } = useAuthContext();
  const { currentTerm } = useSchoolStore();

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [scheduleForm, setScheduleForm] = useState(EMPTY_SCHEDULE_FORM);

  const [termFilter, setTermFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState(null);
  const [generateTargetId, setGenerateTargetId] = useState(null);

  const selectedTermId = termFilter !== 'All' ? termFilter : undefined;

  const { data: yearsResult } = useAcademicYears(schoolId);
  const { data: classesResult } = useClasses(schoolId);
  const { data: categoriesResult, isLoading: categoriesLoading } = useFeeCategories(schoolId);
  const { data: schedulesResult, isLoading: schedulesLoading } = useFeeSchedules({
    schoolId,
    termId: selectedTermId,
  });
  const { data: studentFeesResult, isLoading: studentFeesLoading } = useStudentFees({
    schoolId,
    termId: selectedTermId,
    status: statusFilter !== 'All' && statusFilter !== 'Overdue' ? statusFilter : undefined,
  });
  const { data: financeSummary, isLoading: financeSummaryLoading } = useFinanceSummary(
    schoolId,
    selectedTermId ?? currentTerm?.id
  );

  const createFeeCategory = useCreateFeeCategory();
  const deleteFeeCategory = useDeleteFeeCategory();
  const createFeeSchedule = useCreateFeeSchedule();
  const deleteFeeSchedule = useDeleteFeeSchedule();
  const generateStudentFees = useGenerateStudentFees();

  const academicYears = yearsResult?.data ?? [];
  const classes = classesResult?.data ?? [];
  const categories = categoriesResult?.data ?? [];
  const schedules = schedulesResult?.data ?? [];
  const studentFees = studentFeesResult?.data ?? [];

  const todayIso = toIsoDate();

  const terms = useMemo(
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

  const gradeLevels = useMemo(() => {
    const map = new Map();
    classes.forEach((row) => {
      const grade = row.grade_levels;
      if (!grade?.id) return;
      if (!map.has(grade.id)) {
        map.set(grade.id, grade);
      }
    });

    return Array.from(map.values()).sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
  }, [classes]);

  useEffect(() => {
    if (!scheduleForm.term_id && currentTerm?.id) {
      setScheduleForm((prev) => ({ ...prev, term_id: currentTerm.id }));
    }
  }, [currentTerm?.id, scheduleForm.term_id]);

  const assignmentCountByScheduleId = useMemo(() => {
    const map = {};
    studentFees.forEach((row) => {
      const scheduleId = row.fee_schedule_id;
      if (!scheduleId) return;
      map[scheduleId] = (map[scheduleId] ?? 0) + 1;
    });
    return map;
  }, [studentFees]);

  const studentFeeRows = useMemo(() => {
    const rows = studentFees.map((row) => {
      const first = row.students?.first_name ?? '';
      const last = row.students?.last_name ?? '';
      const studentName = `${first} ${last}`.trim() || '—';
      const statusWithDue = getFeeStatusWithDue(row, todayIso);

      return {
        id: row.id,
        studentName,
        studentIdNumber: row.students?.student_id_number ?? '—',
        className: row.students?.classes?.name ?? '—',
        category: row.fee_schedules?.fee_categories?.name ?? '—',
        term: row.fee_schedules?.terms?.label ?? '—',
        amountDue: Number(row.amount_due ?? 0),
        amountPaid: Number(row.amount_paid ?? 0),
        balance: Number(row.balance ?? 0),
        status: statusWithDue,
        dueDate: row.due_date,
      };
    });

    if (statusFilter === 'All') return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [studentFees, statusFilter, todayIso]);

  const studentFeeColumns = useMemo(
    () => [
      {
        accessorKey: 'studentName',
        header: 'Student',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.studentName}</p>
            <p className="text-xs text-text-muted">{row.original.studentIdNumber}</p>
          </div>
        ),
      },
      {
        accessorKey: 'className',
        header: 'Class',
      },
      {
        accessorKey: 'category',
        header: 'Category',
      },
      {
        accessorKey: 'term',
        header: 'Term',
      },
      {
        accessorKey: 'amountDue',
        header: 'Amount Due',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'amountPaid',
        header: 'Paid',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: ({ getValue }) => {
          const value = Number(getValue());
          return (
            <span className={value > 0 ? 'text-status-danger font-semibold' : 'text-status-success font-semibold'}>
              {formatGHS(value)}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" dot />,
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: ({ getValue }) => formatDate(getValue()),
      },
    ],
    []
  );

  const stats = useMemo(
    () => ({
      categories: categories.length,
      schedules: schedules.length,
      due: Number(financeSummary?.totalDue ?? 0),
      outstanding: Number(financeSummary?.outstanding ?? 0),
      collectionRate: Number(financeSummary?.collectionRate ?? 0),
    }),
    [categories.length, schedules.length, financeSummary]
  );

  const clearFilters = () => {
    setTermFilter('All');
    setStatusFilter('All');
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Fee category name is required');
      return;
    }

    await createFeeCategory.mutateAsync({
      school_id: schoolId,
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim() || null,
      is_recurring: categoryForm.is_recurring,
    });

    setCategoryForm(EMPTY_CATEGORY_FORM);
    setShowCategoryForm(false);
  };

  const handleCreateSchedule = async () => {
    if (
      !scheduleForm.fee_category_id ||
      !scheduleForm.grade_level_id ||
      !scheduleForm.term_id ||
      !scheduleForm.amount
    ) {
      toast.error('Complete all required fee schedule fields');
      return;
    }

    const amount = Number(scheduleForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    await createFeeSchedule.mutateAsync({
      school_id: schoolId,
      fee_category_id: scheduleForm.fee_category_id,
      grade_level_id: scheduleForm.grade_level_id,
      term_id: scheduleForm.term_id,
      amount,
      due_date: scheduleForm.due_date || null,
      is_mandatory: scheduleForm.is_mandatory,
    });

    setScheduleForm((prev) => ({
      ...EMPTY_SCHEDULE_FORM,
      term_id: prev.term_id,
    }));
    setShowScheduleForm(false);
  };

  const handleGenerateForSchedule = async (feeScheduleId) => {
    setGenerateTargetId(feeScheduleId);
    try {
      await generateStudentFees.mutateAsync({ schoolId, feeScheduleId });
    } finally {
      setGenerateTargetId(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    await deleteFeeCategory.mutateAsync({ id: deleteCategoryTarget.id, schoolId });
    setDeleteCategoryTarget(null);
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleTarget) return;
    await deleteFeeSchedule.mutateAsync({ id: deleteScheduleTarget.id, schoolId });
    setDeleteScheduleTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Billing"
        subtitle="Configure fee categories and term schedules, then assign fee records to learners"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategoryForm((prev) => !prev)}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4" />
              {showCategoryForm ? 'Close Category Form' : 'Add Category'}
            </button>
            <button
              onClick={() => setShowScheduleForm((prev) => !prev)}
              className="btn-primary text-sm"
            >
              <CalendarDays className="w-4 h-4" />
              {showScheduleForm ? 'Close Schedule Form' : 'Add Fee Schedule'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          title="Categories"
          value={categoriesLoading ? null : stats.categories}
          icon={Receipt}
          color="bg-brand-50 text-brand-600"
          loading={categoriesLoading}
        />
        <StatCard
          title="Schedules"
          value={schedulesLoading ? null : stats.schedules}
          icon={CalendarDays}
          color="bg-blue-50 text-blue-600"
          loading={schedulesLoading}
        />
        <StatCard
          title="Total Due"
          value={financeSummaryLoading ? null : formatGHS(stats.due, true)}
          icon={CreditCard}
          color="bg-status-warningBg text-status-warning"
          loading={financeSummaryLoading}
        />
        <StatCard
          title="Outstanding"
          value={financeSummaryLoading ? null : formatGHS(stats.outstanding, true)}
          icon={Users}
          color="bg-status-dangerBg text-status-danger"
          loading={financeSummaryLoading}
        />
        <StatCard
          title="Collection Rate"
          value={financeSummaryLoading ? null : `${stats.collectionRate}%`}
          icon={CreditCard}
          color="bg-status-successBg text-status-success"
          loading={financeSummaryLoading}
        />
      </div>

      {showCategoryForm ? (
        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Create Fee Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category Name</label>
              <input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tuition"
                className="input-base h-9 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
              <input
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Core academic term fee"
                className="input-base h-9 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={categoryForm.is_recurring}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({ ...prev, is_recurring: e.target.checked }))
                  }
                />
                Recurring
              </label>
              <button
                onClick={handleCreateCategory}
                disabled={createFeeCategory.isPending}
                className="btn-primary h-9 text-sm ml-auto"
              >
                {createFeeCategory.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Save Category
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showScheduleForm ? (
        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Create Fee Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <select
                value={scheduleForm.fee_category_id}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, fee_category_id: e.target.value }))
                }
                className="input-base h-9 text-sm"
              >
                <option value="">Select category...</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Grade Level</label>
              <select
                value={scheduleForm.grade_level_id}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, grade_level_id: e.target.value }))
                }
                className="input-base h-9 text-sm"
              >
                <option value="">Select grade...</option>
                {gradeLevels.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Term</label>
              <select
                value={scheduleForm.term_id}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, term_id: e.target.value }))}
                className="input-base h-9 text-sm"
              >
                <option value="">Select term...</option>
                {terms.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label} ({row.academic_year_label})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Amount (GH₵)</label>
              <input
                type="number"
                min={0}
                value={scheduleForm.amount}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, amount: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Due Date</label>
              <input
                type="date"
                value={scheduleForm.due_date}
                onChange={(e) =>
                  setScheduleForm((prev) => ({ ...prev, due_date: e.target.value }))
                }
                className="input-base h-9 text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={scheduleForm.is_mandatory}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({ ...prev, is_mandatory: e.target.checked }))
                  }
                />
                Mandatory
              </label>
              <button
                onClick={handleCreateSchedule}
                disabled={createFeeSchedule.isPending}
                className="btn-primary text-sm h-9 ml-auto"
              >
                {createFeeSchedule.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Save Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface-muted/40">
            <h2 className="text-sm font-semibold text-text-primary">Fee Categories</h2>
          </div>
          <div className="divide-y divide-border">
            {categories.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-text-muted">No fee categories yet.</div>
            ) : (
              categories.map((row) => (
                <div key={row.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{row.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{row.description || 'No description'}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {row.is_recurring ? 'Recurring category' : 'One-time category'}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteCategoryTarget(row)}
                    className="p-2 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-dangerBg transition-colors"
                    title="Delete fee category"
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface-muted/40">
            <h2 className="text-sm font-semibold text-text-primary">Fee Schedules</h2>
          </div>

          {schedules.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-text-muted">No fee schedules yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {schedules.map((row) => (
                <div key={row.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {row.fee_categories?.name ?? 'Fee Category'} · {row.grade_levels?.name ?? 'Grade'}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {row.terms?.label ?? 'Term'} · {formatGHS(row.amount)} · Due {formatDate(row.due_date)}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Assigned learner fees: {assignmentCountByScheduleId[row.id] ?? 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleGenerateForSchedule(row.id)}
                      className="btn-secondary h-8 text-xs"
                      disabled={generateStudentFees.isPending}
                    >
                      {generateStudentFees.isPending && generateTargetId === row.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Users className="w-3.5 h-3.5" />
                          Generate Fees
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setDeleteScheduleTarget(row)}
                      className="p-2 rounded-lg text-text-muted hover:text-status-danger hover:bg-status-dangerBg transition-colors"
                      title="Delete fee schedule"
                      aria-label={`Delete schedule for ${row.grade_levels?.name ?? 'grade level'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={studentFeeColumns}
          data={studentFeeRows}
          isLoading={studentFeesLoading}
          exportFileName="student-fee-ledger"
          pageSize={50}
          emptyTitle="No student fee records"
          emptyMessage="Create schedules and generate student fees to populate this ledger."
          toolbar={
            <div className="flex items-center gap-2">
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter by term"
              >
                <option value="All">All Terms</option>
                {terms.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter by payment status"
              >
                {STATUS_OPTIONS.map((row) => (
                  <option key={row} value={row}>
                    {row}
                  </option>
                ))}
              </select>

              {(termFilter !== 'All' || statusFilter !== 'All') && (
                <button onClick={clearFilters} className="btn-ghost h-9 px-3 text-xs" aria-label="Clear filters">
                  <FilterX className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          }
        />
      </div>

      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={handleDeleteCategory}
        loading={deleteFeeCategory.isPending}
        title="Delete fee category?"
        message={`This will remove ${deleteCategoryTarget?.name ?? 'this category'} if no schedules depend on it.`}
        confirmLabel="Delete Category"
      />

      <ConfirmDialog
        open={!!deleteScheduleTarget}
        onClose={() => setDeleteScheduleTarget(null)}
        onConfirm={handleDeleteSchedule}
        loading={deleteFeeSchedule.isPending}
        title="Delete fee schedule?"
        message="This removes the schedule configuration. Existing student fee records linked to it may also be removed based on database constraints."
        confirmLabel="Delete Schedule"
      />
    </div>
  );
}
