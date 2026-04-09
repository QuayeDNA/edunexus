import { NavLink, Outlet } from 'react-router-dom';
import { Building2, LayoutDashboard, ScrollText, Shield, Users } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { APP_ROUTES } from '../../utils/constants.js';
import { cn } from '../../utils/cn.js';

const NAV_ITEMS = [
  { to: APP_ROUTES.SUPER_ADMIN_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: APP_ROUTES.SUPER_ADMIN_SCHOOLS, label: 'Schools', icon: Building2 },
  { to: APP_ROUTES.SUPER_ADMIN_USERS, label: 'Users', icon: Users },
  { to: APP_ROUTES.SUPER_ADMIN_AUDIT_LOG, label: 'Audit Log', icon: ScrollText },
];

export default function SuperAdminLayout() {
  const { profile, signOut } = useAuthContext();

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="bg-white border-b border-border no-print">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">Platform Console</p>
              <p className="text-xs text-text-muted truncate">Super Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-text-primary leading-none">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-[11px] text-text-muted mt-1">{profile?.role?.replace('_', ' ')}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-secondary text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-border no-print">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-text-secondary border-border hover:bg-surface-muted'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
