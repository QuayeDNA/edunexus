import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenseSummary,
  useExpenses,
} from '../../../hooks/useFinance.js';
import { storageApi } from '../../../services/api/storage.js';
import { formatDate, formatGHS, formatRelativeTime } from '../../../utils/formatters.js';

const BUDGET_STORE_KEY = 'edunexus:expense-budgets:v1';

const EXPENSE_CATEGORIES = [
  'Utilities',
  'Transport',
  'Maintenance',
  'Supplies',
  'Technology',
  'Events',
  'Salaries',
  'Other',
];

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const toMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthStart = (monthKey) => `${monthKey}-01`;

const getMonthEnd = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthKey}-${String(lastDay).padStart(2, '0')}`;
};

const getBudgetScopeKey = (schoolId, monthKey) => `${schoolId ?? 'unknown'}:${monthKey}`;

const readBudgetStore = () => {
  try {
    const raw = localStorage.getItem(BUDGET_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const writeBudgetStore = (store) => {
  try {
    localStorage.setItem(BUDGET_STORE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage write errors.
  }
};

const EMPTY_EXPENSE_FORM = {
  category: EXPENSE_CATEGORIES[0],
  description: '',
  amount: '',
  date: toIsoDate(),
  receipt_url: '',
};

function FlowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-border rounded-xl shadow-card px-3 py-2.5 text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatGHS(entry.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export default function ExpensesPage() {
  const { schoolId, user } = useAuthContext();

  const [monthFilter, setMonthFilter] = useState(() => toMonthKey());
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [receiptUploading, setReceiptUploading] = useState(false);

  const [budgetCategory, setBudgetCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);

  const startDate = getMonthStart(monthFilter);
  const endDate = getMonthEnd(monthFilter);
  const selectedYear = Number(monthFilter.slice(0, 4));
  const selectedMonth = Number(monthFilter.slice(5, 7));

  const { data: expensesResult, isLoading: expensesLoading } = useExpenses({
    schoolId,
    startDate,
    endDate,
    category: categoryFilter !== 'All' ? categoryFilter : undefined,
    search,
  });

  const { data: expenseSummary, isLoading: summaryLoading } = useExpenseSummary(
    schoolId,
    selectedYear,
    selectedMonth
  );

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const expenses = expensesResult?.data ?? [];

  const categoryOptions = useMemo(() => {
    const fromData = expenses
      .map((row) => row.category)
      .filter(Boolean);

    return Array.from(new Set([...EXPENSE_CATEGORIES, ...fromData])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [expenses]);

  useEffect(() => {
    const store = readBudgetStore();
    const scopeKey = getBudgetScopeKey(schoolId, monthFilter);
    setCategoryBudgets(store[scopeKey] ?? {});
  }, [schoolId, monthFilter]);

  useEffect(() => {
    if (!categoryOptions.includes(expenseForm.category)) {
      setExpenseForm((prev) => ({
        ...prev,
        category: categoryOptions[0] ?? EXPENSE_CATEGORIES[0],
      }));
    }
  }, [categoryOptions, expenseForm.category]);

  useEffect(() => {
    if (!categoryOptions.includes(budgetCategory)) {
      setBudgetCategory(categoryOptions[0] ?? EXPENSE_CATEGORIES[0]);
    }
  }, [budgetCategory, categoryOptions]);

  const expenseRows = useMemo(
    () =>
      expenses.map((row) => {
        const approverName = `${row.profiles?.first_name ?? ''} ${row.profiles?.last_name ?? ''}`.trim();

        return {
          id: row.id,
          date: row.date,
          category: row.category ?? 'Other',
          description: row.description ?? '—',
          amount: Number(row.amount ?? 0),
          receiptUrl: row.receipt_url ?? '',
          approvedBy: approverName || '—',
          createdAt: row.created_at,
        };
      }),
    [expenses]
  );

  const spentByCategory = useMemo(() => {
    const totals = {};
    expenseRows.forEach((row) => {
      const key = row.category || 'Other';
      totals[key] = (totals[key] ?? 0) + Number(row.amount ?? 0);
    });
    return totals;
  }, [expenseRows]);

  const budgetRows = useMemo(() => {
    const mergedCategories = Array.from(
      new Set([
        ...Object.keys(spentByCategory),
        ...Object.keys(categoryBudgets),
      ])
    ).sort((a, b) => a.localeCompare(b));

    return mergedCategories.map((categoryName) => {
      const spent = Number(spentByCategory[categoryName] ?? 0);
      const budget = Number(categoryBudgets[categoryName] ?? 0);
      const remaining = budget > 0 ? budget - spent : 0;
      const usagePercent = budget > 0 ? (spent / budget) * 100 : 0;

      return {
        category: categoryName,
        spent,
        budget,
        remaining,
        usagePercent,
      };
    });
  }, [categoryBudgets, spentByCategory]);

  const totalBudget = useMemo(
    () => Object.values(categoryBudgets).reduce((sum, value) => sum + Number(value ?? 0), 0),
    [categoryBudgets]
  );

  const totalExpense = Number(expenseSummary?.totalExpense ?? 0);
  const totalIncome = Number(expenseSummary?.totalIncome ?? 0);
  const budgetUsagePercent = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;
  const topCategory = expenseSummary?.byCategory?.[0]?.category ?? '—';

  const monthlyFlow = expenseSummary?.monthlyFlow ?? [];

  const expenseColumns = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: 'category',
        header: 'Category',
      },
      {
        accessorKey: 'description',
        header: 'Description',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="font-semibold text-status-danger">{formatGHS(getValue())}</span>
        ),
      },
      {
        accessorKey: 'receiptUrl',
        header: 'Receipt',
        cell: ({ getValue }) => {
          const url = getValue();
          if (!url) return <span className="text-xs text-text-muted">No attachment</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-700 underline underline-offset-2"
            >
              View receipt
            </a>
          );
        },
      },
      {
        accessorKey: 'approvedBy',
        header: 'Approved By',
      },
      {
        accessorKey: 'createdAt',
        header: 'Recorded',
        cell: ({ getValue }) => formatRelativeTime(getValue()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => setDeleteTarget(row.original)}
            className="btn-ghost h-8 px-2 text-status-danger"
            aria-label={`Delete expense ${row.original.description}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ),
      },
    ],
    []
  );

  const persistBudgets = (nextBudgets) => {
    const store = readBudgetStore();
    const scopeKey = getBudgetScopeKey(schoolId, monthFilter);

    if (!nextBudgets || Object.keys(nextBudgets).length === 0) {
      delete store[scopeKey];
    } else {
      store[scopeKey] = nextBudgets;
    }

    writeBudgetStore(store);
  };

  const handleReceiptUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setReceiptUploading(true);
      const { publicUrl } = await storageApi.uploadPublicImage({
        file,
        bucket: 'school-assets',
        folder: `schools/${schoolId || 'unknown'}/expenses`,
      });

      setExpenseForm((prev) => ({ ...prev, receipt_url: publicUrl }));
      toast.success('Receipt image uploaded');
    } catch (err) {
      toast.error(err.message ?? 'Failed to upload receipt');
    } finally {
      setReceiptUploading(false);
      event.target.value = '';
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.category.trim() || !expenseForm.description.trim() || !expenseForm.amount || !expenseForm.date) {
      toast.error('Complete category, description, amount, and date');
      return;
    }

    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Expense amount must be greater than zero');
      return;
    }

    await createExpense.mutateAsync({
      school_id: schoolId,
      category: expenseForm.category.trim(),
      description: expenseForm.description.trim(),
      amount,
      date: expenseForm.date,
      approved_by: user?.id ?? null,
      receipt_url: expenseForm.receipt_url || null,
    });

    setExpenseForm((prev) => ({
      ...EMPTY_EXPENSE_FORM,
      category: prev.category,
      date: toIsoDate(),
    }));
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    await deleteExpense.mutateAsync({ id: deleteTarget.id, schoolId });
    setDeleteTarget(null);
  };

  const handleSetBudget = () => {
    if (!budgetCategory) {
      toast.error('Select a category first');
      return;
    }

    const amount = Number(budgetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Budget must be greater than zero');
      return;
    }

    const nextBudgets = {
      ...categoryBudgets,
      [budgetCategory]: amount,
    };

    setCategoryBudgets(nextBudgets);
    persistBudgets(nextBudgets);
    setBudgetAmount('');
    toast.success(`Budget set for ${budgetCategory}`);
  };

  const handleClearBudget = (categoryName) => {
    const nextBudgets = { ...categoryBudgets };
    delete nextBudgets[categoryName];
    setCategoryBudgets(nextBudgets);
    persistBudgets(nextBudgets);
    toast.success(`Budget cleared for ${categoryName}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Track school spending, monitor budgets, and compare income versus expenses"
        actions={
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
            aria-label="Select expense month"
          />
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          title="Expenses"
          value={summaryLoading ? null : formatGHS(totalExpense, true)}
          icon={Wallet}
          color="bg-status-dangerBg text-status-danger"
          loading={summaryLoading}
        />
        <StatCard
          title="Income"
          value={summaryLoading ? null : formatGHS(totalIncome, true)}
          icon={BarChart3}
          color="bg-status-successBg text-status-success"
          loading={summaryLoading}
        />
        <StatCard
          title="Net"
          value={summaryLoading ? null : formatGHS((expenseSummary?.netBalance ?? 0), true)}
          icon={CalendarDays}
          color="bg-brand-50 text-brand-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Budget Used"
          value={summaryLoading ? null : totalBudget > 0 ? `${budgetUsagePercent}%` : 'No budget'}
          icon={Wallet}
          color="bg-amber-50 text-amber-700"
          loading={summaryLoading}
        />
        <StatCard
          title="Top Category"
          value={summaryLoading ? null : topCategory}
          icon={BarChart3}
          color="bg-blue-50 text-blue-600"
          loading={summaryLoading}
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Record Expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createExpense.isPending}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
            <input
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Electricity bill, stationery restock..."
              className="input-base h-9 text-sm"
              disabled={createExpense.isPending}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Amount (GH₵)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createExpense.isPending}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Expense Date</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={createExpense.isPending}
            />
          </div>

          <div className="flex items-end gap-2">
            <label className="btn-secondary h-9 text-sm cursor-pointer">
              {receiptUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {receiptUploading ? 'Uploading...' : 'Attach Receipt'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReceiptUpload}
                disabled={receiptUploading || createExpense.isPending}
              />
            </label>
            <button
              onClick={handleCreateExpense}
              disabled={createExpense.isPending || receiptUploading}
              className="btn-primary h-9 text-sm"
            >
              {createExpense.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Save Expense
                </>
              )}
            </button>
          </div>
        </div>

        {expenseForm.receipt_url ? (
          <p className="text-xs text-text-muted">
            Receipt attached:{' '}
            <a
              href={expenseForm.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 underline underline-offset-2"
            >
              preview image
            </a>
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Income vs Expense Trend</h2>
              <p className="text-xs text-text-muted mt-0.5">Monthly comparison for {selectedYear}</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyFlow} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₵${value / 1000}K`}
              />
              <Tooltip content={<FlowTooltip />} />
              <Bar dataKey="income" name="Income" fill="#16A34A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#DC2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Budget Tracking</h2>
            <p className="text-xs text-text-muted mt-0.5">Set monthly budget per category and monitor usage</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={budgetCategory}
              onChange={(e) => setBudgetCategory(e.target.value)}
              className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
              aria-label="Budget category"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              step="0.01"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="Budget (GH₵)"
              className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
            />

            <button onClick={handleSetBudget} className="btn-primary h-9 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Set Budget
            </button>
          </div>

          {budgetRows.length === 0 ? (
            <p className="text-xs text-text-muted">No category budgets set for this month yet.</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {budgetRows.map((row) => {
                const progress = Math.max(0, Math.min(100, Math.round(row.usagePercent)));
                const isOver = row.budget > 0 && row.spent > row.budget;

                return (
                  <div key={row.category} className="border border-border rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-text-primary">{row.category}</p>
                      <button
                        onClick={() => handleClearBudget(row.category)}
                        className="text-[11px] text-text-muted hover:text-status-danger"
                        aria-label={`Clear budget for ${row.category}`}
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {formatGHS(row.spent)} / {row.budget > 0 ? formatGHS(row.budget) : 'No budget'}
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className={isOver ? 'h-full bg-status-danger' : 'h-full bg-brand-600'}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {row.budget > 0 ? (
                      <p className={`text-[11px] mt-1 ${isOver ? 'text-status-danger' : 'text-text-muted'}`}>
                        {isOver
                          ? `Over budget by ${formatGHS(Math.abs(row.remaining))}`
                          : `Remaining ${formatGHS(row.remaining)}`}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={expenseColumns}
          data={expenseRows}
          isLoading={expensesLoading}
          exportFileName={`expenses-${monthFilter}`}
          pageSize={50}
          searchable={false}
          emptyTitle="No expenses recorded"
          emptyMessage="Add an expense above or broaden your filter range."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search category, description..."
                  className="input-base h-9 text-xs pl-8 min-w-56"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter by expense category"
              >
                <option value="All">All Categories</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        message={deleteTarget ? `Delete expense "${deleteTarget.description}"? This cannot be undone.` : ''}
        confirmLabel="Delete Expense"
        loading={deleteExpense.isPending}
      />
    </div>
  );
}
