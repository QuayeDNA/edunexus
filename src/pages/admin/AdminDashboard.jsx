import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, CreditCard, TrendingUp, CalendarCheck,
  AlertTriangle, ArrowRight, TrendingDown,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useUiStore } from '../../store/uiStore.js';
import { useSchoolStore } from '../../store/schoolStore.js';
import { cn } from '../../utils/cn.js';
import { formatGHS } from '../../utils/formatters.js';

// ─── Mock data (replace with TanStack Query hooks once backend is wired) ──────

const MOCK_STATS = [
  { title: 'Total Students', value: '847', delta: '+23 this term', icon: GraduationCap, color: 'bg-brand-50 text-brand-600' },
  { title: 'Active Staff', value: '62', delta: '4 on leave', icon: Users, color: 'bg-accent-100 text-accent-600' },
  { title: 'Fee Collection', value: '78%', delta: 'GH₵ 148,200 collected', icon: CreditCard, color: 'bg-status-successBg text-status-success' },
  { title: 'Today\'s Attendance', value: '91%', delta: '771 of 847 present', icon: CalendarCheck, color: 'bg-status-infoBg text-status-info' },
];

const MOCK_FEE_DATA = [
  { month: 'Sep', expected: 52000, collected: 44200 },
  { month: 'Oct', expected: 52000, collected: 48800 },
  { month: 'Nov', expected: 52000, collected: 51200 },
  { month: 'Dec', expected: 52000, collected: 49600 },
  { month: 'Jan', expected: 55000, collected: 42000 },
  { month: 'Feb', expected: 55000, collected: 38500 },
];

const MOCK_ENROLLMENT_DATA = [
  { term: 'T1 2023', students: 780 },
  { term: 'T2 2023', students: 793 },
  { term: 'T3 2023', students: 801 },
  { term: 'T1 2024', students: 824 },
  { term: 'T2 2024', students: 847 },
];

const MOCK_RECENT_PAYMENTS = [
  { id: 1, student: 'Kofi Mensah', class: 'JHS 3A', amount: 850, method: 'MTN MoMo', time: '10 min ago' },
  { id: 2, student: 'Ama Asante', class: 'Primary 5A', amount: 620, method: 'Cash', time: '42 min ago' },
  { id: 3, student: 'Kwame Boateng', class: 'JHS 1A', amount: 720, method: 'Vodafone Cash', time: '1h ago' },
  { id: 4, student: 'Abena Owusu', class: 'Primary 3A', amount: 580, method: 'MTN MoMo', time: '2h ago' },
  { id: 5, student: 'Yaw Darko', class: 'KG 2A', amount: 420, method: 'Bank Transfer', time: '3h ago' },
];

const MOCK_ALERTS = [
  { type: 'fee', message: '47 students have outstanding fees older than 14 days', link: '/admin/finance/fees', severity: 'warning' },
  { type: 'attendance', message: '3 students in JHS 3A below 75% attendance threshold', link: '/admin/attendance', severity: 'danger' },
  { type: 'inventory', message: '5 inventory items below reorder level', link: '/admin/inventory', severity: 'info' },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ title, value, delta, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-text-primary">{value}</p>
      {delta && <p className="text-xs text-text-muted mt-1.5 font-medium">{delta}</p>}
    </div>
  );
}

function AlertBanner({ type, message, link, severity }) {
  const styles = {
    warning: 'bg-status-warningBg border-status-warning text-status-warning',
    danger:  'bg-status-dangerBg border-status-danger text-status-danger',
    info:    'bg-status-infoBg border-status-info text-status-info',
  };
  return (
    <Link
      to={link}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium hover:opacity-90 transition-opacity',
        styles[severity]
      )}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <ArrowRight className="w-4 h-4 flex-shrink-0" />
    </Link>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { setPageTitle } = useUiStore();
  const { activeSchool, currentTerm } = useSchoolStore();

  useEffect(() => { setPageTitle('Dashboard'); }, [setPageTitle]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Good morning 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {activeSchool?.name ?? 'Your School'} · {currentTerm?.label ?? 'First Term'}
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Link to="/admin/students/new" className="btn-primary text-sm">
            + Add Student
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {MOCK_ALERTS.length > 0 && (
        <div className="space-y-2">
          {MOCK_ALERTS.map((alert, i) => (
            <AlertBanner key={i} {...alert} />
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_STATS.map(stat => <StatCard key={stat.title} {...stat} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fee collection chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Fee Collection</h3>
              <p className="text-xs text-text-muted mt-0.5">Expected vs collected (GH₵)</p>
            </div>
            <Link to="/admin/finance/reports" className="text-xs text-brand-600 hover:underline font-medium">
              View report →
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_FEE_DATA} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₵${v/1000}K`} />
              <Tooltip
                formatter={(value, name) => [formatGHS(value), name === 'expected' ? 'Expected' : 'Collected']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="expected" fill="#E0E7FF" radius={[4, 4, 0, 0]} name="expected" />
              <Bar dataKey="collected" fill="#6366F1" radius={[4, 4, 0, 0]} name="collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Enrollment trend */}
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Enrollment Trend</h3>
              <p className="text-xs text-text-muted mt-0.5">Students per term</p>
            </div>
            <TrendingUp className="w-4 h-4 text-accent-500" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_ENROLLMENT_DATA}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="term" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Area type="monotone" dataKey="students" stroke="#10B981" strokeWidth={2} fill="url(#enrollGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent payments */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Recent Payments</h3>
            <Link to="/admin/finance/payments" className="text-xs text-brand-600 hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {MOCK_RECENT_PAYMENTS.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-brand-600">{p.student[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{p.student}</p>
                  <p className="text-xs text-text-muted">{p.class} · {p.method}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-status-success">{formatGHS(p.amount)}</p>
                  <p className="text-xs text-text-muted">{p.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Mark Attendance', icon: CalendarCheck, to: '/admin/attendance', color: 'text-brand-600 bg-brand-50' },
              { label: 'Record Payment', icon: CreditCard, to: '/admin/finance/payments', color: 'text-accent-600 bg-accent-100' },
              { label: 'Add Student', icon: GraduationCap, to: '/admin/students/new', color: 'text-status-info bg-status-infoBg' },
              { label: 'Generate Reports', icon: TrendingUp, to: '/admin/academics/reports', color: 'text-status-warning bg-status-warningBg' },
              { label: 'Send Message', icon: Users, to: '/admin/messaging', color: 'text-brand-600 bg-brand-50' },
              { label: 'Run Payroll', icon: TrendingDown, to: '/admin/payroll', color: 'text-status-danger bg-status-dangerBg' },
            ].map(({ label, icon: Icon, to, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-text-primary group-hover:text-brand-700 transition-colors">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
