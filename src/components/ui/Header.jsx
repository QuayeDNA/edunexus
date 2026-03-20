import { Bell, Search, Menu } from 'lucide-react';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useSchoolStore } from '../../store/schoolStore.js';
import { cn } from '../../utils/cn.js';

export default function Header() {
  const { toggleSidebar, pageTitle, toggleNotificationsPanel } = useUiStore();
  const { profile } = useAuthContext();
  const { currentTerm, activeSchool } = useSchoolStore();

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-6 gap-4 flex-shrink-0 no-print">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden btn-ghost p-2"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden md:flex">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search students, staff, fees..."
            className="input-base pl-9 py-2 text-sm bg-surface-muted border-surface-muted focus:bg-white"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Term badge */}
      {currentTerm && (
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 rounded-lg">
          <span className="text-xs font-medium text-brand-700">{currentTerm.label}</span>
          <span className="text-xs text-brand-400">·</span>
          <span className="text-xs text-brand-500">{activeSchool?.name?.split(' ')[0]}</span>
        </div>
      )}

      {/* Notifications */}
      <button
        onClick={toggleNotificationsPanel}
        className="btn-ghost p-2 relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {/* Unread indicator */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-danger rounded-full" />
      </button>

      {/* User avatar */}
      <div className="flex items-center gap-2.5 pl-2 border-l border-border">
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
          <span className="text-xs font-bold text-brand-700">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </span>
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-text-primary leading-none">
            {profile?.first_name} {profile?.last_name}
          </p>
          <p className="text-xs text-text-muted capitalize mt-0.5">{profile?.role}</p>
        </div>
      </div>
    </header>
  );
}
