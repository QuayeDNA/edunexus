import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  Wallet,
  XCircle,
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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import {
  useCreatePayrollRun,
  usePayrollAnalytics,
  usePayrollRunSSNITSummary,
  usePayrollRuns,
  usePayslips,
  useSetPayrollRunStatus,
  useUpdatePayslipAdjustments,
} from '../../../hooks/usePayroll.js';
import { useSchoolStore } from '../../../store/schoolStore.js';
import {
  formatDate,
  formatGHS,
  formatRelativeTime,
} from '../../../utils/formatters.js';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const monthLabel = (month) => MONTH_LABELS[Math.max(0, Number(month || 1) - 1)] ?? 'N/A';

const monthYearLabel = (month, year) => `${monthLabel(month)} ${year ?? ''}`.trim();

const sanitizeFileName = (value) => {
  const cleaned = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'file';
};

const csvEscape = (value) => {
  const raw = String(value ?? '');
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const downloadTextFile = (content, filename, mime = 'text/plain;charset=utf-8;') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

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

export default function PayrollPage() {
  const { schoolId, user } = useAuthContext();
  const { activeSchool } = useSchoolStore();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [createMonth, setCreateMonth] = useState(currentMonth);
  const [runStatusFilter, setRunStatusFilter] = useState('All');
  const [runSearch, setRunSearch] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [payslipStatusFilter, setPayslipStatusFilter] = useState('All');
  const [payslipSearch, setPayslipSearch] = useState('');
  const [adjustmentDrafts, setAdjustmentDrafts] = useState({});
  const [savingAdjustmentId, setSavingAdjustmentId] = useState('');
  const [markPaidOnProcess, setMarkPaidOnProcess] = useState(true);
  const [showCancelRunDialog, setShowCancelRunDialog] = useState(false);

  const { data: runsResult, isLoading: runsLoading } = usePayrollRuns({
    schoolId,
    year: selectedYear,
    status: runStatusFilter,
    search: runSearch,
  });

  const runs = runsResult?.data ?? [];

  const selectedRun = useMemo(
    () => runs.find((row) => row.id === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  const { data: payslipsResult, isLoading: payslipsLoading } = usePayslips({
    schoolId,
    payrollRunId: selectedRunId || undefined,
    status: payslipStatusFilter,
    search: payslipSearch,
  });

  const payslips = payslipsResult?.data ?? [];

  const { data: analytics, isLoading: analyticsLoading } = usePayrollAnalytics(schoolId, selectedYear);
  const { data: ssnitSummary, isLoading: ssnitLoading } = usePayrollRunSSNITSummary(selectedRunId || undefined);

  const createPayrollRun = useCreatePayrollRun();
  const setPayrollRunStatus = useSetPayrollRunStatus();
  const updatePayslipAdjustments = useUpdatePayslipAdjustments();

  useEffect(() => {
    if (runs.length === 0) {
      if (selectedRunId) setSelectedRunId('');
      return;
    }

    const stillExists = runs.some((row) => row.id === selectedRunId);
    if (!selectedRunId || !stillExists) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  useEffect(() => {
    setAdjustmentDrafts((prev) => {
      const next = { ...prev };
      const ids = new Set(payslips.map((row) => row.id));
      let changed = false;

      Object.keys(next).forEach((id) => {
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      payslips.forEach((row) => {
        if (!next[row.id]) {
          next[row.id] = {
            otherAllowances: String(Number(row.other_allowances ?? 0).toFixed(2)),
            otherDeductions: String(Number(row.other_deductions ?? 0).toFixed(2)),
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [payslips]);

  const runRows = useMemo(
    () =>
      runs.map((row) => {
        const processorName = `${row.profiles?.first_name ?? ''} ${row.profiles?.last_name ?? ''}`.trim();

        return {
          id: row.id,
          period: monthYearLabel(row.month, row.year),
          month: row.month,
          year: row.year,
          status: row.status ?? 'Draft',
          payslipProgress: `${row.paidCount ?? 0}/${row.payslipCount ?? 0}`,
          totalGross: Number(row.total_gross ?? 0),
          totalDeductions: Number(row.total_deductions ?? 0),
          totalNet: Number(row.total_net ?? 0),
          processorName: processorName || '—',
          processedAt: row.processed_at,
        };
      }),
    [runs]
  );

  const payslipRows = useMemo(
    () =>
      payslips.map((row) => {
        const staffName = `${row.staff?.first_name ?? ''} ${row.staff?.last_name ?? ''}`.trim() || '—';

        return {
          id: row.id,
          staffName,
          staffIdNumber: row.staff?.staff_id_number ?? '—',
          department: row.staff?.department ?? '—',
          role: row.staff?.role ?? '—',
          basicSalary: Number(row.basic_salary ?? 0),
          housingAllowance: Number(row.housing_allowance ?? 0),
          transportAllowance: Number(row.transport_allowance ?? 0),
          otherAllowances: Number(row.other_allowances ?? 0),
          grossSalary: Number(row.gross_salary ?? 0),
          ssnitEmployee: Number(row.ssnit_employee ?? 0),
          ssnitEmployer: Number(row.ssnit_employer ?? 0),
          incomeTax: Number(row.income_tax ?? 0),
          otherDeductions: Number(row.other_deductions ?? 0),
          netSalary: Number(row.net_salary ?? 0),
          paymentStatus: row.payment_status ?? 'Pending',
          paymentDate: row.payment_date,
          pdfUrl: row.pdf_url,
          runMonth: row.payroll_runs?.month,
          runYear: row.payroll_runs?.year,
        };
      }),
    [payslips]
  );

  const handleCreateRun = async () => {
    const result = await createPayrollRun.mutateAsync({
      schoolId,
      month: createMonth,
      year: selectedYear,
      processedBy: user?.id,
    });

    const newRunId = result?.data?.payrollRun?.id;
    if (newRunId) {
      setSelectedRunId(newRunId);
    }
  };

  const handleUpdateRunStatus = async (status) => {
    if (!selectedRunId) return;

    await setPayrollRunStatus.mutateAsync({
      id: selectedRunId,
      schoolId,
      status,
      processedBy: user?.id,
      markPayslipsPaid: status === 'Processed' ? markPaidOnProcess : false,
      paymentDate: toIsoDate(),
    });
  };

  const handleSaveAdjustments = async (payslipId) => {
    const draft = adjustmentDrafts[payslipId];
    if (!draft) return;

    const allowances = Number(draft.otherAllowances ?? 0);
    const deductions = Number(draft.otherDeductions ?? 0);

    if (!Number.isFinite(allowances) || allowances < 0 || !Number.isFinite(deductions) || deductions < 0) {
      toast.error('Allowances and deductions must be valid positive numbers');
      return;
    }

    setSavingAdjustmentId(payslipId);
    try {
      await updatePayslipAdjustments.mutateAsync({
        id: payslipId,
        otherAllowances: allowances,
        otherDeductions: deductions,
      });
    } finally {
      setSavingAdjustmentId('');
    }
  };

  const handleDownloadPayslipPdf = useCallback(
    (row) => {
      const schoolName = activeSchool?.name ?? 'EduNexus';
      const schoolAddress = activeSchool?.address ?? 'N/A';
      const schoolPhone = activeSchool?.phone ?? 'N/A';

      const period = monthYearLabel(row.runMonth, row.runYear);
      const documentTitle = `${schoolName} Payslip`;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(documentTitle, 14, 16);

      doc.setFontSize(10);
      doc.text(`Address: ${schoolAddress}`, 14, 24);
      doc.text(`Phone: ${schoolPhone}`, 14, 29);

      autoTable(doc, {
        startY: 36,
        theme: 'grid',
        head: [['Field', 'Value']],
        body: [
          ['Staff', row.staffName],
          ['Staff ID', row.staffIdNumber],
          ['Department', row.department],
          ['Role', row.role],
          ['Payroll Period', period],
          ['Payment Status', row.paymentStatus],
          ['Payment Date', formatDate(row.paymentDate)],
        ],
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 10 },
      });

      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY ?? 36) + 6,
        theme: 'grid',
        head: [['Earnings', 'Amount (GHS)']],
        body: [
          ['Basic Salary', formatGHS(row.basicSalary)],
          ['Housing Allowance', formatGHS(row.housingAllowance)],
          ['Transport Allowance', formatGHS(row.transportAllowance)],
          ['Other Allowances', formatGHS(row.otherAllowances)],
          ['Gross Salary', formatGHS(row.grossSalary)],
        ],
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 10 },
      });

      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY ?? 36) + 6,
        theme: 'grid',
        head: [['Deductions', 'Amount (GHS)']],
        body: [
          ['SSNIT (Employee)', formatGHS(row.ssnitEmployee)],
          ['PAYE Tax', formatGHS(row.incomeTax)],
          ['Other Deductions', formatGHS(row.otherDeductions)],
          ['Net Salary', formatGHS(row.netSalary)],
        ],
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 10 },
      });

      const signatureY = (doc.lastAutoTable?.finalY ?? 36) + 12;
      doc.setFontSize(10);
      doc.text('Employee Signature: __________________________', 14, signatureY);
      doc.text('Authorized Signature: _________________________', 14, signatureY + 8);

      const filename = `payslip-${sanitizeFileName(row.staffIdNumber)}-${sanitizeFileName(period)}.pdf`;
      doc.save(filename);
    },
    [activeSchool]
  );

  const handleExportP9Csv = () => {
    if (!selectedRun) {
      toast.error('Select a payroll run first');
      return;
    }

    if (payslipRows.length === 0) {
      toast.error('No payslips available for export');
      return;
    }

    const headers = [
      'Staff ID',
      'Staff Name',
      'Department',
      'Period',
      'Gross Salary',
      'SSNIT Employee',
      'PAYE Tax',
      'Other Deductions',
      'Net Salary',
      'Payment Status',
      'Payment Date',
    ];

    const lines = [headers.join(',')];
    payslipRows.forEach((row) => {
      lines.push(
        [
          row.staffIdNumber,
          row.staffName,
          row.department,
          monthYearLabel(row.runMonth, row.runYear),
          row.grossSalary,
          row.ssnitEmployee,
          row.incomeTax,
          row.otherDeductions,
          row.netSalary,
          row.paymentStatus,
          row.paymentDate || '',
        ]
          .map(csvEscape)
          .join(',')
      );
    });

    const fileName = `p9-export-${selectedRun.year}-${String(selectedRun.month).padStart(2, '0')}.csv`;
    downloadTextFile(lines.join('\n'), fileName, 'text/csv;charset=utf-8;');
    toast.success('P9 CSV exported');
  };

  const handleExportSSNITPdf = () => {
    if (!selectedRun) {
      toast.error('Select a payroll run first');
      return;
    }

    const summary = ssnitSummary ?? { totalEmployee: 0, totalEmployer: 0, total: 0 };
    const period = monthYearLabel(selectedRun.month, selectedRun.year);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SSNIT Contribution Summary', 14, 16);
    doc.setFontSize(10);
    doc.text(`School: ${activeSchool?.name ?? 'EduNexus'}`, 14, 24);
    doc.text(`Period: ${period}`, 14, 29);

    autoTable(doc, {
      startY: 36,
      theme: 'grid',
      head: [['Metric', 'Amount']],
      body: [
        ['Employee Contribution', formatGHS(summary.totalEmployee ?? 0)],
        ['Employer Contribution', formatGHS(summary.totalEmployer ?? 0)],
        ['Total SSNIT', formatGHS(summary.total ?? 0)],
      ],
      headStyles: { fillColor: [17, 24, 39] },
      styles: { fontSize: 10 },
    });

    doc.save(`ssnit-summary-${sanitizeFileName(period)}.pdf`);
    toast.success('SSNIT summary PDF exported');
  };

  const runsColumns = useMemo(
    () => [
      {
        accessorKey: 'period',
        header: 'Period',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} dot size="sm" />,
      },
      {
        accessorKey: 'payslipProgress',
        header: 'Paid / Total',
      },
      {
        accessorKey: 'totalGross',
        header: 'Gross',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'totalDeductions',
        header: 'Deductions',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'totalNet',
        header: 'Net',
        cell: ({ getValue }) => <span className="font-semibold text-status-success">{formatGHS(getValue())}</span>,
      },
      {
        accessorKey: 'processedAt',
        header: 'Processed',
        cell: ({ getValue }) => formatRelativeTime(getValue()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => setSelectedRunId(row.original.id)}
            className="btn-secondary h-8 px-2 text-xs"
            aria-label={`Select payroll run ${row.original.period}`}
          >
            View
          </button>
        ),
      },
    ],
    []
  );

  const payslipsColumns = useMemo(
    () => [
      {
        accessorKey: 'staffName',
        header: 'Staff',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.staffName}</p>
            <p className="text-xs text-text-muted">{row.original.staffIdNumber} · {row.original.department}</p>
          </div>
        ),
      },
      {
        accessorKey: 'basicSalary',
        header: 'Basic',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'grossSalary',
        header: 'Gross',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'incomeTax',
        header: 'PAYE',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'ssnitEmployee',
        header: 'SSNIT',
        cell: ({ getValue }) => formatGHS(getValue()),
      },
      {
        accessorKey: 'netSalary',
        header: 'Net',
        cell: ({ getValue }) => <span className="font-semibold text-status-success">{formatGHS(getValue())}</span>,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Payment Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" dot />,
      },
      {
        id: 'adjustments',
        header: 'Adjustments',
        cell: ({ row }) => {
          const draft = adjustmentDrafts[row.original.id] ?? {
            otherAllowances: String(Number(row.original.otherAllowances ?? 0).toFixed(2)),
            otherDeductions: String(Number(row.original.otherDeductions ?? 0).toFixed(2)),
          };

          return (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.otherAllowances}
                onChange={(e) =>
                  setAdjustmentDrafts((prev) => ({
                    ...prev,
                    [row.original.id]: {
                      ...draft,
                      otherAllowances: e.target.value,
                    },
                  }))
                }
                className="w-20 text-xs border border-border rounded px-1.5 py-1"
                aria-label={`Other allowances for ${row.original.staffName}`}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.otherDeductions}
                onChange={(e) =>
                  setAdjustmentDrafts((prev) => ({
                    ...prev,
                    [row.original.id]: {
                      ...draft,
                      otherDeductions: e.target.value,
                    },
                  }))
                }
                className="w-20 text-xs border border-border rounded px-1.5 py-1"
                aria-label={`Other deductions for ${row.original.staffName}`}
              />
              <button
                onClick={() => handleSaveAdjustments(row.original.id)}
                disabled={savingAdjustmentId === row.original.id}
                className="btn-secondary h-8 px-2 text-xs"
                aria-label={`Save adjustments for ${row.original.staffName}`}
              >
                {savingAdjustmentId === row.original.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Save'
                )}
              </button>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Payslip PDF',
        cell: ({ row }) => (
          <button
            onClick={() => handleDownloadPayslipPdf(row.original)}
            className="btn-secondary h-8 px-2 text-xs"
            aria-label={`Download payslip for ${row.original.staffName}`}
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
        ),
      },
    ],
    [adjustmentDrafts, handleDownloadPayslipPdf, savingAdjustmentId]
  );

  const totals = analytics?.totals ?? {
    gross: 0,
    deductions: 0,
    net: 0,
    runs: 0,
    processedRuns: 0,
  };

  const monthlyHistory = analytics?.monthlyHistory ?? MONTH_LABELS.map((month) => ({
    month,
    gross: 0,
    deductions: 0,
    net: 0,
  }));

  const departmentTotals = analytics?.departmentTotals ?? [];

  const runActionPending = setPayrollRunStatus.isPending;
  const canApprove = selectedRun?.status === 'Draft';
  const canProcess = selectedRun?.status === 'Approved';
  const canCancel = !!selectedRun && selectedRun.status !== 'Processed' && selectedRun.status !== 'Cancelled';
  const canResetDraft = selectedRun?.status === 'Approved';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Run monthly payroll, auto-calculate SSNIT and PAYE, and manage payslip processing"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={String(selectedYear)}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
              aria-label="Select payroll year"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={String(createMonth)}
              onChange={(e) => setCreateMonth(Number(e.target.value))}
              className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
              aria-label="Select payroll run month"
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>

            <button
              onClick={handleCreateRun}
              disabled={createPayrollRun.isPending}
              className="btn-primary h-9 text-sm"
            >
              {createPayrollRun.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Run
                </>
              )}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          title="Gross Payroll"
          value={analyticsLoading ? null : formatGHS(totals.gross, true)}
          icon={Wallet}
          color="bg-status-warningBg text-status-warning"
          loading={analyticsLoading}
        />
        <StatCard
          title="Deductions"
          value={analyticsLoading ? null : formatGHS(totals.deductions, true)}
          icon={BarChart3}
          color="bg-status-dangerBg text-status-danger"
          loading={analyticsLoading}
        />
        <StatCard
          title="Net Payroll"
          value={analyticsLoading ? null : formatGHS(totals.net, true)}
          icon={TrendingUp}
          color="bg-status-successBg text-status-success"
          loading={analyticsLoading}
        />
        <StatCard
          title="Runs"
          value={analyticsLoading ? null : totals.runs}
          icon={CalendarDays}
          color="bg-brand-50 text-brand-600"
          loading={analyticsLoading}
        />
        <StatCard
          title="Processed"
          value={analyticsLoading ? null : totals.processedRuns}
          icon={CheckCircle2}
          color="bg-blue-50 text-blue-600"
          loading={analyticsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Payroll Trend</h2>
              <p className="text-xs text-text-muted mt-0.5">Monthly gross, deductions, and net for {selectedYear}</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyHistory} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `GHs ${Math.round(v / 1000)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="gross" name="Gross" fill="#E0E7FF" radius={[3, 3, 0, 0]} />
              <Bar dataKey="deductions" name="Deductions" fill="#FCA5A5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#16A34A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Department Payroll Cost</h2>
            <p className="text-xs text-text-muted mt-0.5">Top net salary totals by department</p>
          </div>

          {departmentTotals.length === 0 ? (
            <p className="text-xs text-text-muted">No department payroll data for selected year.</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {departmentTotals.slice(0, 8).map((row) => (
                <div key={row.department} className="border border-border rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-text-primary">{row.department}</p>
                    <p className="text-xs text-text-muted">{row.staffCount} payslips</p>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Gross {formatGHS(row.gross)} · Net <span className="font-semibold text-status-success">{formatGHS(row.net)}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={runsColumns}
          data={runRows}
          isLoading={runsLoading}
          exportFileName={`payroll-runs-${selectedYear}`}
          pageSize={50}
          searchable={false}
          emptyTitle="No payroll runs"
          emptyMessage="Create a payroll run for the selected month and year."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  value={runSearch}
                  onChange={(e) => setRunSearch(e.target.value)}
                  placeholder="Search month, status..."
                  className="input-base h-9 text-xs pl-8 min-w-52"
                />
              </div>

              <select
                value={runStatusFilter}
                onChange={(e) => setRunStatusFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter payroll runs by status"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Processed">Processed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          }
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Payslips & Workflow</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {selectedRun
                ? `Selected run: ${monthYearLabel(selectedRun.month, selectedRun.year)} (${selectedRun.status})`
                : 'Select a payroll run to view and manage payslips.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleUpdateRunStatus('Approved')}
              disabled={!canApprove || runActionPending}
              className="btn-secondary h-9 text-xs"
            >
              {runActionPending && canApprove ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Approve Run
            </button>

            <button
              onClick={() => handleUpdateRunStatus('Draft')}
              disabled={!canResetDraft || runActionPending}
              className="btn-secondary h-9 text-xs"
            >
              Reset to Draft
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={markPaidOnProcess}
                onChange={(e) => setMarkPaidOnProcess(e.target.checked)}
              />
              Mark payslips as paid on process
            </label>

            <button
              onClick={() => handleUpdateRunStatus('Processed')}
              disabled={!canProcess || runActionPending}
              className="btn-primary h-9 text-xs"
            >
              {runActionPending && canProcess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Process Run
            </button>

            <button
              onClick={() => setShowCancelRunDialog(true)}
              disabled={!canCancel || runActionPending}
              className="btn-danger h-9 text-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Run
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-text-muted">Employee SSNIT</p>
            <p className="text-sm font-semibold text-text-primary mt-0.5">
              {ssnitLoading ? 'Loading...' : formatGHS(ssnitSummary?.totalEmployee ?? 0)}
            </p>
          </div>
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-text-muted">Employer SSNIT</p>
            <p className="text-sm font-semibold text-text-primary mt-0.5">
              {ssnitLoading ? 'Loading...' : formatGHS(ssnitSummary?.totalEmployer ?? 0)}
            </p>
          </div>
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs text-text-muted">Total SSNIT</p>
            <p className="text-sm font-semibold text-brand-700 mt-0.5">
              {ssnitLoading ? 'Loading...' : formatGHS(ssnitSummary?.total ?? 0)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <DataTable
            columns={payslipsColumns}
            data={payslipRows}
            isLoading={payslipsLoading}
            exportFileName={`payslips-${selectedYear}`}
            pageSize={50}
            searchable={false}
            emptyTitle="No payslips"
            emptyMessage="Create and select a payroll run to generate payslips."
            toolbar={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="search"
                    value={payslipSearch}
                    onChange={(e) => setPayslipSearch(e.target.value)}
                    placeholder="Search staff, id, dept..."
                    className="input-base h-9 text-xs pl-8 min-w-56"
                  />
                </div>

                <select
                  value={payslipStatusFilter}
                  onChange={(e) => setPayslipStatusFilter(e.target.value)}
                  className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                  aria-label="Filter payslips by payment status"
                >
                  <option value="All">All Payment Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>

                <button onClick={handleExportP9Csv} className="btn-secondary h-9 text-xs" disabled={!selectedRunId}>
                  <Download className="w-3.5 h-3.5" />
                  Export P9 CSV
                </button>

                <button onClick={handleExportSSNITPdf} className="btn-secondary h-9 text-xs" disabled={!selectedRunId}>
                  <Download className="w-3.5 h-3.5" />
                  SSNIT PDF
                </button>
              </div>
            }
          />
        </div>
      </div>

      <ConfirmDialog
        open={showCancelRunDialog}
        onClose={() => setShowCancelRunDialog(false)}
        onConfirm={async () => {
          setShowCancelRunDialog(false);
          await handleUpdateRunStatus('Cancelled');
        }}
        title="Cancel Payroll Run"
        message={selectedRun ? `Cancel ${monthYearLabel(selectedRun.month, selectedRun.year)} payroll run?` : ''}
        confirmLabel="Cancel Run"
        loading={runActionPending}
      />
    </div>
  );
}
