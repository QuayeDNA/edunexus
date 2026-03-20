import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, BookOpenCheck, FileText, Library, MessageSquare, LogOut } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { cn } from '../../utils/cn.js';
import { APP_NAME } from '../../utils/constants.js';

const teacherLinks = [
  { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/teacher/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/teacher/grades', icon: BookOpenCheck, label: 'Grades' },
  { to: '/teacher/lessons', icon: FileText, label: 'Lesson Plans' },
  { to: '/teacher/library', icon: Library, label: 'Library' },
  { to: '/teacher/messaging', icon: MessageSquare, label: 'Messages' },
];

export default function TeacherSidebar() {
  const { sidebarCollapsed } = useUiStore();
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  return (
    <aside className={cn('fixed left-0 top-0 h-full z-40 flex flex-col bg-white border-r border-border transition-all duration-300 no-print', sidebarCollapsed ? 'w-16' : 'w-60')}>
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
            <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
            <circle cx="16" cy="18" r="3" fill="#10B981" />
          </svg>
        </div>
        {!sidebarCollapsed && <span className="ml-2.5 text-sm font-bold text-text-primary">{APP_NAME}</span>}
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {teacherLinks.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('nav-link', isActive && 'active', sidebarCollapsed && 'justify-center')}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button onClick={async () => { await signOut(); navigate('/login'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary hover:bg-red-50 hover:text-status-danger transition-colors" aria-label="Sign out">
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
