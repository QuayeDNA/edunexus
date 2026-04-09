import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, CreditCard, CalendarCheck,
  TrendingUp, AlertTriangle, ArrowRight,
  BookOpen, BarChart3, Banknote, Bell,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { useUiStore } from '../../store/uiStore.js';
import { useSchoolStore } from '../../store/schoolStore.js';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useStudents } from '../../hooks/useStudents.js';
import { useStaff } from '../../hooks/useStaff.js';
import { useClasses } from '../../hooks/useClasses.js';
import {
  useFinanceSummary,
  useMonthlyFeeAnalytics,
  useRecentPayments,
} from '../../hooks/useFinance.js';
import StatCard from '../../components/ui/StatCard.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import { formatGHS, formatRelativeTime } from '../../utils/formatters.js';
import { cn } from '../../utils/cn.js';

const ENROLLMENT_DATA = [
  { term: 'T1 \'23', count: 780 },
  { term: 'T2 \'23', count: 793 },
  { term: 'T3 \'23', count: 801 },
  { term: 'T1 \'24', count: 824 },
  { term: 'T2 \'24', count: 847 },
];

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-card px-3 py-2.5 text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatGHS(p.value, true) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ severity, message, link }) {
  const styles = {
    warning: 'bg-status-warningBg border-status-warning/50 text-status-warning',
    danger:  'bg-status-dangerBg border-status-danger/50 text-status-danger',
    info:    'bg-status-infoBg border-status-info/50 text-status-info',
  };
  return (
    <Link
      to={link}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium hover:opacity-90 transition-all group',
        styles[severity]
      )}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1 leading-snug">{message}</span>
      <ArrowRight className="w-4 h-4 shrink-0 opacity-60 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ label, icon: Icon, to, color }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-text-primary group-hover:text-brand-700 transition-colors">
        {label}
      </span>
    </Link>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { setPageTitle } = useUiStore();
  const { activeSchool, currentTerm, currentAcademicYear } = useSchoolStore();
  const { profile, schoolId } = useAuthContext();

  // Live data queries
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ schoolId });
  const { data: staffData, isLoading: staffLoading } = useStaff({ schoolId });
  const { data: classesData, isLoading: classesLoading } = useClasses(schoolId);
  const { data: financeSummary, isLoading: financeLoading } = useFinanceSummary(
    schoolId,
    currentTerm?.id
  );
  const { data: monthlyFeeAnalytics = [] } = useMonthlyFeeAnalytics(
    schoolId,
    new Date().getFullYear(),
    currentTerm?.id
  );
  const { data: recentPayments = [], isLoading: recentPaymentsLoading } = useRecentPayments(
    schoolId,
    5
  );

  const totalStudents = studentsData?.count ?? studentsData?.data?.length ?? 0;
  const totalStaff = staffData?.count ?? staffData?.data?.length ?? 0;
  const totalClasses = classesData?.data?.length ?? 0;
  const feeCollectionRate = Number(financeSummary?.collectionRate ?? 0);
  const totalCollected = Number(financeSummary?.totalPaid ?? 0);
  const outstandingAmount = Number(financeSummary?.outstanding ?? 0);
  const overdueCount = Number(financeSummary?.overdueCount ?? 0);

  const alerts = useMemo(() => {
    const rows = [];

    if (overdueCount > 0) {
      rows.push({
        severity: 'warning',
        message: `${overdueCount} fee record${overdueCount !== 1 ? 's are' : ' is'} overdue in the current term`,
        link: '/admin/finance/fees',
      });
    }

    if (outstandingAmount > 0) {
      rows.push({
        severity: 'info',
        message: `${formatGHS(outstandingAmount, true)} remains outstanding for this term`,
        link: '/admin/finance/reports',
      });
    }

    return rows;
  }, [overdueCount, outstandingAmount]);

  const feeChartData = useMemo(() => {
    if (monthlyFeeAnalytics.length > 0) return monthlyFeeAnalytics;

    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
      (month) => ({
        month,
        expected: 0,
        collected: 0,
      })
    );
  }, [monthlyFeeAnalytics]);

  useEffect(() => { setPageTitle('Dashboard'); }, [setPageTitle]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {greeting}, {profile?.first_name} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {activeSchool?.name} &middot; {currentTerm?.label ?? 'First Term'} &middot;{' '}
            {currentAcademicYear?.label ?? new Date().getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/students/new" className="btn-primary text-sm">
            <GraduationCap className="w-4 h-4" />
            Add Student
          </Link>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertBanner key={i} {...a} />)}
        </div>
      )}

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={studentsLoading ? null : totalStudents.toLocaleString()}
          delta="+23 this term"
          trend="up"
          icon={GraduationCap}
          color="bg-brand-50 text-brand-600"
          loading={studentsLoading}
          onClick={() => {}}
        />
        <StatCard
          title="Active Staff"
          value={staffLoading ? null : totalStaff.toLocaleString()}
          delta="4 on leave"
          icon={Users}
          color="bg-accent-100 text-accent-600"
          loading={staffLoading}
        />
        <StatCard
          title="Fee Collection"
          value={financeLoading ? null : `${feeCollectionRate}%`}
          delta={financeLoading ? null : `${formatGHS(totalCollected, true)} collected`}
          trend="up"
          icon={CreditCard}
          color="bg-status-successBg text-status-success"
          loading={financeLoading}
        />
        <StatCard
          title="Today's Attendance"
          value="91%"
          delta={`${totalStudents > 0 ? Math.round(totalStudents * 0.91) : '771'} present`}
          icon={CalendarCheck}
          color="bg-status-infoBg text-status-info"
        />
      </div>

      {/* ── Secondary Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Classes', value: classesLoading ? '…' : totalClasses, icon: BookOpen, to: '/admin/classes', color: 'text-purple-600' },
          {
            label: 'Outstanding Fees',
            value: financeLoading ? '…' : formatGHS(outstandingAmount, true),
            icon: Banknote,
            to: '/admin/finance/fees',
            color: 'text-status-warning',
          },
          { label: 'Unread Notifications', value: '12', icon: Bell, to: '/admin/messaging', color: 'text-status-info' },
        ].map(({ label, value, icon: Icon, to, color }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-xl border border-border p-4 shadow-card hover:shadow-md hover:border-brand-200 transition-all flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center shrink-0">
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-sm font-bold text-text-primary">{value}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Fee collection — 3/5 width */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Fee Collection</h3>
              <p className="text-xs text-text-muted mt-0.5">Expected vs collected · GH₵</p>
            </div>
            <Link to="/admin/finance/reports" className="text-xs text-brand-600 hover:underline font-medium">
              Full report →
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={feeChartData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₵${v/1000}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="expected" name="Expected" fill="#E0E7FF" radius={[3, 3, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#6366F1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Enrollment trend — 2/5 width */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Enrollment</h3>
              <p className="text-xs text-text-muted mt-0.5">Students per term</p>
            </div>
            <TrendingUp className="w-4 h-4 text-accent-500" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={ENROLLMENT_DATA} margin={{ top: 4 }}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="term" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" name="Students" stroke="#10B981" strokeWidth={2} fill="url(#enrollGrad)" dot={{ fill: '#10B981', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent payments */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Recent Payments</h3>
            <Link to="/admin/finance/payments" className="text-xs text-brand-600 hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentPaymentsLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-surface-hover" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-3.5 rounded bg-surface-hover w-32" />
                    <div className="h-3 rounded bg-surface-hover w-44" />
                  </div>
                  <div className="w-20 h-3.5 rounded bg-surface-hover" />
                </div>
              ))
            ) : recentPayments.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-text-muted">No recent payments yet.</div>
            ) : (
              recentPayments.map((payment) => {
                const firstName = payment.students?.first_name ?? '';
                const lastName = payment.students?.last_name ?? '';
                const studentName = `${firstName} ${lastName}`.trim() || 'Unknown Student';
                const className = payment.students?.classes?.name ?? 'Unassigned class';

                return (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted/40 transition-colors"
                  >
                    <Avatar firstName={firstName} lastName={lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{studentName}</p>
                      <p className="text-xs text-text-muted">
                        {className} &middot; {payment.payment_method ?? 'Payment'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-status-success">
                        {formatGHS(payment.amount ?? 0)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatRelativeTime(payment.created_at ?? payment.payment_date)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2.5">
            <QuickAction label="Mark Attendance" icon={CalendarCheck} to="/admin/attendance" color="bg-brand-50 text-brand-600" />
            <QuickAction label="Record Payment"  icon={CreditCard}    to="/admin/finance/payments" color="bg-accent-100 text-accent-600" />
            <QuickAction label="Add Student"     icon={GraduationCap} to="/admin/students/new" color="bg-status-infoBg text-status-info" />
            <QuickAction label="Add Staff"       icon={Users}          to="/admin/staff/new" color="bg-purple-50 text-purple-600" />
            <QuickAction label="Send Message"    icon={Bell}           to="/admin/messaging" color="bg-status-warningBg text-status-warning" />
            <QuickAction label="Run Payroll"     icon={Banknote}       to="/admin/payroll" color="bg-status-dangerBg text-status-danger" />
          </div>
        </div>
      </div>
    </div>
  );
}
