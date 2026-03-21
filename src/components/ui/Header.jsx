import { Bell, Search, Menu } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useSchoolStore } from '../../store/schoolStore.js';
import { useUnreadCount } from '../../hooks/useNotifications.js';
import { formatInitials } from '../../utils/formatters.js';
import { cn } from '../../utils/cn.js';

export default function Header() {
  const { toggleSidebar, toggleNotificationsPanel } = useUiStore();
  const { profile } = useAuthContext();
  const { currentTerm, activeSchool } = useSchoolStore();
  const { data: unreadCount = 0 } = useUnreadCount();

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 lg:px-6 gap-3 flex-shrink-0 no-print">
      <button onClick={toggleSidebar} className="lg:hidden btn-ghost p-2" aria-label="Toggle navigation menu">
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1 max-w-sm hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input type="search" placeholder="Search students, staff, fees..." className="w-full pl-9 pr-3 py-2 text-sm border border-transparent rounded-lg bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-brand-300 placeholder:text-text-muted transition-all" />
        </div>
      </div>
      <div className="flex-1" />
      {currentTerm && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          <span className="text-xs font-semibold text-brand-700">{currentTerm.label}</span>
          {activeSchool?.name && (<><span className="text-brand-300">·</span><span className="text-xs text-brand-500 max-w-[120px] truncate">{activeSchool.name}</span></>)}
        </div>
      )}
      <button onClick={toggleNotificationsPanel} className="relative btn-ghost p-2" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <div className="flex items-center gap-2.5 pl-3 border-l border-border">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center ring-2 ring-brand-200 flex-shrink-0">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            : <span className="text-xs font-bold text-brand-700">{profile?.first_name?.[0]}{profile?.last_name?.[0]}</span>
          }
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-text-primary leading-none">{profile?.first_name} {profile?.last_name}</p>
          <p className="text-[11px] text-text-muted capitalize mt-0.5">{profile?.role?.replace('_', ' ')}</p>
        </div>
      </div>
    </header>
  );
}
