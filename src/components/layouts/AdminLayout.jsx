import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from '../ui/Sidebar.jsx';
import Header from '../ui/Header.jsx';
import WelcomeModal from '../ui/WelcomeModal.jsx';
import NotificationsPanel from '../ui/NotificationsPanel.jsx';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useSchoolData, useCurrentTerm } from '../../hooks/useSchool.js';
import { cn } from '../../utils/cn.js';

export default function AdminLayout() {
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen } = useUiStore();
  const { profile, schoolId } = useAuthContext();
  const { showWelcomeModal, setShowWelcomeModal } = useUiStore();

  // Bootstrap school data and current term into global store
  useSchoolData(schoolId);
  useCurrentTerm(schoolId);

  // Show welcome modal on FIRST login — persisted in localStorage so it
  // only ever appears once per user, even across page refreshes.
  useEffect(() => {
    if (!profile?.id) return;
    const key = `edunexus-welcomed-${profile.id}`;
    if (!localStorage.getItem(key)) {
      setShowWelcomeModal(true);
      localStorage.setItem(key, '1');
    }
  }, [profile?.id, setShowWelcomeModal]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      {/* ── Mobile backdrop — closes sidebar on tap ─────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main content — offset by sidebar width via CSS var ──────────────── */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out',
          // On large screens, push content right by sidebar width
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60',
          // On mobile, no left margin (sidebar overlays)
          'ml-0'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Notifications panel ──────────────────────────────────────────────── */}
      <NotificationsPanel />

      {/* ── Welcome modal (once per user) ───────────────────────────────────── */}
      {showWelcomeModal && (
        <WelcomeModal onClose={() => setShowWelcomeModal(false)} />
      )}
    </div>
  );
}