import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CreditCard,
  Loader2,
  Receipt,
  Search,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import {
  useFinanceSummary,
  usePayments,
  useRecordPayment,
  useStudentFees,
} from '../../../hooks/useFinance.js';
import { useSchoolStore } from '../../../store/schoolStore.js';
import {
  detectMoMoProvider,
  PAYMENT_METHODS,
} from '../../../utils/constants.js';
import {
  formatDate,
  formatGHS,
  formatRelativeTime,
} from '../../../utils/formatters.js';

const toIsoDate = (date = new Date()) => date.toISOString().slice(0, 10);

const INITIAL_PAYMENT_FORM = {
  student_fee_id: '',
  amount: '',
  payment_method: 'Cash',
  payment_date: toIsoDate(),
  mobile_money_number: '',
  notes: '',
};

export default function PaymentsPage() {
  const { schoolId, user } = useAuthContext();
  const { currentTerm } = useSchoolStore();

  const [paymentForm, setPaymentForm] = useState(INITIAL_PAYMENT_FORM);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toIsoDate(d);
  });
  const [toDate, setToDate] = useState(toIsoDate());

  const { data: outstandingFeesResult, isLoading: outstandingLoading } = useStudentFees({
    schoolId,
    termId: currentTerm?.id,
    onlyOutstanding: true,
  });
  const { data: paymentsResult, isLoading: paymentsLoading } = usePayments({
    schoolId,
    startDate: fromDate,
    endDate: toDate,
    search,
  });
  const { data: financeSummary, isLoading: summaryLoading } = useFinanceSummary(schoolId, currentTerm?.id);

  const recordPayment = useRecordPayment();

  const outstandingFees = outstandingFeesResult?.data ?? [];
  const payments = paymentsResult?.data ?? [];

  const selectedFeeRow = useMemo(
    () => outstandingFees.find((row) => row.id === paymentForm.student_fee_id) ?? null,
    [outstandingFees, paymentForm.student_fee_id]
  );

  const selectedMoMoProvider = useMemo(
    () => detectMoMoProvider(paymentForm.mobile_money_number),
    [paymentForm.mobile_money_number]
  );

  const filteredPayments = useMemo(() => {
    if (methodFilter === 'All') return payments;
    return payments.filter((row) => row.payment_method === methodFilter);
  }, [payments, methodFilter]);

  const paymentRows = useMemo(
    () =>
      filteredPayments.map((row) => {
        const first = row.students?.first_name ?? '';
        const last = row.students?.last_name ?? '';
        const studentName = `${first} ${last}`.trim() || '—';

        return {
          id: row.id,
          paymentDate: row.payment_date,
          studentName,
          className: row.students?.classes?.name ?? '—',
          paymentMethod: row.payment_method ?? '—',
          amount: Number(row.amount ?? 0),
          referenceNumber: row.reference_number ?? '—',
          receiptNumber: row.receipt_number ?? '—',
          recordedAt: row.created_at,
        };
      }),
    [filteredPayments]
  );

  const todayCollected = useMemo(() => {
    const today = toIsoDate();
    return payments
      .filter((row) => row.payment_date === today)
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  }, [payments]);

  const rangeCollected = useMemo(
    () => filteredPayments.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    [filteredPayments]
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
        accessorKey: 'paymentMethod',
        header: 'Method',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="font-semibold text-status-success">{formatGHS(getValue())}</span>
        ),
      },
      {
        accessorKey: 'referenceNumber',
        header: 'Reference',
      },
      {
        accessorKey: 'receiptNumber',
        header: 'Receipt',
      },
      {
        accessorKey: 'recordedAt',
        header: 'Recorded',
        cell: ({ getValue }) => formatRelativeTime(getValue()),
      },
    ],
    []
  );

  const handleStudentFeeSelect = (nextId) => {
    const selected = outstandingFees.find((row) => row.id === nextId);

    setPaymentForm((prev) => ({
      ...prev,
      student_fee_id: nextId,
      amount: selected ? String(Number(selected.balance ?? 0).toFixed(2)) : '',
    }));
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.student_fee_id) {
      toast.error('Select a learner fee item first');
      return;
    }

    if (!selectedFeeRow?.student_id) {
      toast.error('Selected fee item is invalid. Refresh and try again.');
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    if (amount > Number(selectedFeeRow.balance ?? 0)) {
      toast.error('Payment amount cannot exceed outstanding balance');
      return;
    }

    if (paymentForm.payment_method.includes('MoMo') && !paymentForm.mobile_money_number.trim()) {
      toast.error('Mobile money number is required for MoMo payments');
      return;
    }

    await recordPayment.mutateAsync({
      schoolId,
      studentFeeId: selectedFeeRow.id,
      studentId: selectedFeeRow.student_id,
      amount,
      paymentDate: paymentForm.payment_date,
      paymentMethod: paymentForm.payment_method,
      mobileMoneyNumber: paymentForm.mobile_money_number,
      notes: paymentForm.notes,
      receivedBy: user?.id,
    });

    setPaymentForm((prev) => ({
      ...INITIAL_PAYMENT_FORM,
      payment_method: prev.payment_method,
      payment_date: toIsoDate(),
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Record fee payments and monitor collection performance"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Outstanding"
          value={summaryLoading ? null : formatGHS(financeSummary?.outstanding ?? 0, true)}
          icon={Wallet}
          color="bg-status-dangerBg text-status-danger"
          loading={summaryLoading}
        />
        <StatCard
          title="Collected Today"
          value={paymentsLoading ? null : formatGHS(todayCollected, true)}
          icon={CalendarDays}
          color="bg-brand-50 text-brand-600"
          loading={paymentsLoading}
        />
        <StatCard
          title="Collected in Range"
          value={paymentsLoading ? null : formatGHS(rangeCollected, true)}
          icon={CreditCard}
          color="bg-status-successBg text-status-success"
          loading={paymentsLoading}
        />
        <StatCard
          title="Payments Count"
          value={paymentsLoading ? null : paymentRows.length}
          icon={Receipt}
          color="bg-blue-50 text-blue-600"
          loading={paymentsLoading}
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Record Payment</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Learner Fee Item</label>
            <select
              value={paymentForm.student_fee_id}
              onChange={(e) => handleStudentFeeSelect(e.target.value)}
              className="input-base h-9 text-sm"
              disabled={outstandingLoading || recordPayment.isPending}
            >
              <option value="">Select outstanding fee...</option>
              {outstandingFees.map((row) => {
                const first = row.students?.first_name ?? '';
                const last = row.students?.last_name ?? '';
                const studentName = `${first} ${last}`.trim() || 'Student';
                const className = row.students?.classes?.name ?? 'Class';
                const category = row.fee_schedules?.fee_categories?.name ?? 'Fee';
                const balance = formatGHS(row.balance ?? 0, true);

                return (
                  <option key={row.id} value={row.id}>
                    {studentName} · {className} · {category} · Bal {balance}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Amount (GH₵)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="input-base h-9 text-sm"
              disabled={recordPayment.isPending}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Payment Method</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) =>
                setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))
              }
              className="input-base h-9 text-sm"
              disabled={recordPayment.isPending}
            >
              {PAYMENT_METHODS.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentForm.payment_date}
              onChange={(e) =>
                setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))
              }
              className="input-base h-9 text-sm"
              disabled={recordPayment.isPending}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
            <input
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes"
              className="input-base h-9 text-sm"
              disabled={recordPayment.isPending}
            />
          </div>
        </div>

        {paymentForm.payment_method.includes('MoMo') ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">MoMo Number</label>
              <input
                value={paymentForm.mobile_money_number}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, mobile_money_number: e.target.value }))
                }
                placeholder="0241234567"
                className="input-base h-9 text-sm"
                disabled={recordPayment.isPending}
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <p className="text-xs text-text-muted">
                Detected network:{' '}
                <span className="font-semibold text-text-primary">
                  {selectedMoMoProvider?.name ?? 'Not detected yet'}
                </span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {selectedFeeRow
              ? `Outstanding for selected item: ${formatGHS(selectedFeeRow.balance ?? 0)}`
              : 'Select an outstanding fee item to prefill payment amount.'}
          </p>
          <button
            onClick={handleRecordPayment}
            disabled={recordPayment.isPending}
            className="btn-primary h-9 text-sm"
          >
            {recordPayment.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={paymentColumns}
          data={paymentRows}
          isLoading={paymentsLoading}
          exportFileName="payments-ledger"
          pageSize={50}
          searchable={false}
          emptyTitle="No payments in selected range"
          emptyMessage="Record a payment above or adjust date filters."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student, ref, class..."
                  className="input-base h-9 text-xs pl-8 min-w-56"
                />
              </div>

              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Filter payments by method"
              >
                <option value="All">All Methods</option>
                {PAYMENT_METHODS.map((row) => (
                  <option key={row} value={row}>
                    {row}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Payments from date"
              />

              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Payments to date"
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
