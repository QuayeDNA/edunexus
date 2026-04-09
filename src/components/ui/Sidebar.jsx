import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList,
  CreditCard, Banknote, ArrowLeftRight, Bus, Package, Library,
  MessageSquare, BarChart3, Settings, ChevronLeft, ChevronRight,
  LogOut, Building2, X, Calendar
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useSchoolStore } from '../../store/schoolStore.js';
import { cn } from '../../utils/cn.js';
import { APP_NAME } from '../../utils/constants.js';

const navSections = [
  {
    label: 'Core',
    links: [
      { to: '/admin/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/students',             icon: GraduationCap,   label: 'Students' },
      { to: '/admin/staff',                icon: Users,           label: 'Staff' },
      { to: '/admin/classes',              icon: Building2,       label: 'Classes' },
    ],
  },
  {
    label: 'Academics',
    links: [
      { to: '/admin/academics/subjects',     icon: BookOpen,      label: 'Subjects' },
      { to: '/admin/academics/timetable',    icon: ClipboardList, label: 'Timetable' },
      { to: '/admin/academics/assessments',  icon: ClipboardList, label: 'Assessments' },
      { to: '/admin/academics/reports',      icon: ClipboardList, label: 'Report Cards' },
      { to: '/admin/attendance',             icon: ClipboardList, label: 'Attendance' },
      { to: '/admin/academics/calendar',     icon: Calendar, label: 'Calendar' },
    ],
  },
  {
    label: 'Finance',
    links: [
      { to: '/admin/finance/fees',      icon: CreditCard,     label: 'Fees & Billing' },
      { to: '/admin/finance/payments',  icon: ArrowLeftRight, label: 'Payments' },
      { to: '/admin/finance/expenses',  icon: Banknote,       label: 'Expenses' },
      { to: '/admin/payroll',           icon: Banknote,       label: 'Payroll' },
    ],
  },
  {
    label: 'Services',
    links: [
      { to: '/admin/library',    icon: Library,       label: 'E-Library' },
      { to: '/admin/messaging',  icon: MessageSquare, label: 'Messaging' },
      { to: '/admin/transport',  icon: Bus,           label: 'Transport' },
      { to: '/admin/inventory',  icon: Package,       label: 'Inventory' },
    ],
  },
  {
    label: 'Insights',
    links: [
      { to: '/admin/reports',   icon: BarChart3, label: 'Reports' },
      { to: '/admin/settings',  icon: Settings,  label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed, sidebarOpen, setSidebarOpen } = useUiStore();
  const { profile, signOut } = useAuthContext();
  const { activeSchool } = useSchoolStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    setSidebarOpen(false);
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        // Base
        'fixed left-0 top-0 h-full z-40 flex flex-col bg-white border-r border-border transition-all duration-300 ease-in-out no-print',
        // Desktop width based on collapsed state
        sidebarCollapsed ? 'w-16' : 'w-60',
        // Mobile: hidden by default, shown when sidebarOpen
        !sidebarOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0',
      )}
    >
      {/* ── Logo / School name ─────────────────────────────────────────────── */}
      <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
            <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
            <circle cx="16" cy="18" r="3" fill="#10B981" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className="ml-2.5 min-w-0 flex-1">
            <p className="text-sm font-bold text-text-primary truncate">{APP_NAME}</p>
            <p className="text-xs text-text-muted truncate">
              {activeSchool?.name ?? 'Loading...'}
            </p>
          </div>
        )}
        {/* Mobile close button */}
        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden btn-ghost p-1 ml-1 flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            {!sidebarCollapsed && (
              <p className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {section.label}
              </p>
            )}
            {section.links.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'nav-link',
                    isActive && 'active',
                    sidebarCollapsed && 'justify-center px-0'
                  )
                }
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-border p-3 flex-shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5 mb-2 px-1">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-brand-700">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-[10px] text-text-muted capitalize">{profile?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:bg-red-50 hover:text-status-danger transition-colors',
            sidebarCollapsed && 'justify-center px-0'
          )}
          aria-label="Sign out"
          title={sidebarCollapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && 'Sign out'}
        </button>
      </div>

      {/* ── Desktop collapse toggle ───────────────────────────────────────── */}
      <button
        onClick={toggleSidebarCollapsed}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-border shadow-sm items-center justify-center hover:bg-surface-hover transition-colors z-50"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed
          ? <ChevronRight className="w-3 h-3 text-text-muted" />
          : <ChevronLeft  className="w-3 h-3 text-text-muted" />
        }
      </button>
    </aside>
  );
}