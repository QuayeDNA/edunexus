import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import {
  useFinanceSummary,
  useMonthlyFeeAnalytics,
  usePayments,
} from '../../../hooks/useFinance.js';
import { useAcademicYears } from '../../../hooks/useSchool.js';
import { useSchoolStore } from '../../../store/schoolStore.js';
import {
  formatDate,
  formatGHS,
  formatRelativeTime,
} from '../../../utils/formatters.js';

const PIE_COLORS = ['#16A34A', '#D97706', '#DC2626', '#6366F1'];

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

function ChartTooltip({ active, payload, label }) {
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

export default function FinancialReportsPage() {
  const { schoolId } = useAuthContext();
  const { currentTerm } = useSchoolStore();

  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTermId, setSelectedTermId] = useState(currentTerm?.id ?? 'All');

  const { data: yearsResult } = useAcademicYears(schoolId);
  const { data: financeSummary, isLoading: financeSummaryLoading } = useFinanceSummary(
    schoolId,
    selectedTermId !== 'All' ? selectedTermId : undefined
  );
  const { data: monthlyAnalytics = [], isLoading: monthlyLoading } = useMonthlyFeeAnalytics(
    schoolId,
    selectedYear,
    selectedTermId !== 'All' ? selectedTermId : undefined
  );

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;
  const { data: paymentsResult, isLoading: paymentsLoading } = usePayments({
    schoolId,
    startDate: yearStart,
    endDate: yearEnd,
  });

  const payments = paymentsResult?.data ?? [];
  const summary = financeSummary ?? {
    totalDue: 0,
    totalPaid: 0,
    outstanding: 0,
    collectionRate: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    waivedCount: 0,
    overdueCount: 0,
    totalRecords: 0,
  };

  const termOptions = useMemo(
    () =>
      (yearsResult?.data ?? [])
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
    [yearsResult]
  );

  const statusDistribution = useMemo(
    () => [
      { name: 'Paid', value: summary.paidCount ?? 0 },
      { name: 'Partial', value: summary.partialCount ?? 0 },
      { name: 'Unpaid', value: summary.unpaidCount ?? 0 },
      { name: 'Waived', value: summary.waivedCount ?? 0 },
    ],
    [summary]
  );

  const paymentRows = useMemo(
    () =>
      payments.map((row) => {
        const first = row.students?.first_name ?? '';
        const last = row.students?.last_name ?? '';
        const studentName = `${first} ${last}`.trim() || 'Unknown Student';

        return {
          id: row.id,
          paymentDate: row.payment_date,
          studentName,
          className: row.students?.classes?.name ?? '—',
          method: row.payment_method ?? '—',
          amount: Number(row.amount ?? 0),
          receipt: row.receipt_number ?? '—',
          reference: row.reference_number ?? '—',
          createdAt: row.created_at,
        };
      }),
    [payments]
  );

  const paymentColumns = useMemo(
    () => [
      {
        accessorKey: 'paymentDate',
        header: 'Date',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: 'studentName',
        header: 'Student',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.studentName}</p>
            <p className="text-xs text-text-muted">{row.original.className}</p>
          </div>
        ),
      },
      {
        accessorKey: 'method',
        header: 'Method',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'receipt',
        header: 'Receipt',
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
      },
      {
        accessorKey: 'createdAt',
        header: 'Recorded',
        cell: ({ getValue }) => formatRelativeTime(getValue()),
      },
    ],
    []
  );

  const collectionGap = Math.max(Number(summary.totalDue ?? 0) - Number(summary.totalPaid ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        subtitle="Track collections, liabilities, and payment flow trends"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={String(selectedYear)}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
              aria-label="Select reporting year"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
              aria-label="Select reporting term"
            >
              <option value="All">All Terms</option>
              {termOptions.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label} ({term.academic_year_label})
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          title="Total Due"
          value={financeSummaryLoading ? null : formatGHS(summary.totalDue ?? 0, true)}
          icon={CreditCard}
          color="bg-status-warningBg text-status-warning"
          loading={financeSummaryLoading}
        />
        <StatCard
          title="Collected"
          value={financeSummaryLoading ? null : formatGHS(summary.totalPaid ?? 0, true)}
          icon={TrendingUp}
          color="bg-status-successBg text-status-success"
          loading={financeSummaryLoading}
        />
        <StatCard
          title="Outstanding"
          value={financeSummaryLoading ? null : formatGHS(summary.outstanding ?? 0, true)}
          icon={TrendingDown}
          color="bg-status-dangerBg text-status-danger"
          loading={financeSummaryLoading}
        />
        <StatCard
          title="Collection Rate"
          value={financeSummaryLoading ? null : `${summary.collectionRate ?? 0}%`}
          icon={BarChart3}
          color="bg-brand-50 text-brand-600"
          loading={financeSummaryLoading}
        />
        <StatCard
          title="Overdue Records"
          value={financeSummaryLoading ? null : summary.overdueCount ?? 0}
          icon={CalendarDays}
          color="bg-red-50 text-red-600"
          loading={financeSummaryLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Monthly Collection Trend</h2>
              <p className="text-xs text-text-muted mt-0.5">Expected vs collected in {selectedYear}</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyAnalytics} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₵${v / 1000}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="expected" name="Expected" fill="#E0E7FF" radius={[3, 3, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#6366F1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <p className="text-xs text-text-muted mt-3">
            Collection gap for selected scope: <span className="font-semibold text-status-danger">{formatGHS(collectionGap, true)}</span>
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Fee Status Mix</h2>
              <p className="text-xs text-text-muted mt-0.5">Distribution of student fee records</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Count']} />
            </PieChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {statusDistribution.map((entry, index) => (
              <div key={entry.name} className="text-xs text-text-secondary flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span>
                  {entry.name}: <span className="font-semibold text-text-primary">{entry.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={paymentColumns}
          data={paymentRows}
          isLoading={paymentsLoading || monthlyLoading}
          exportFileName={`financial-payments-${selectedYear}`}
          pageSize={50}
          emptyTitle="No payments available"
          emptyMessage="No payments were recorded in the selected date range."
        />
      </div>
    </div>
  );
}
