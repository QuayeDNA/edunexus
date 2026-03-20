import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from '../ui/Sidebar.jsx';
import Header from '../ui/Header.jsx';
import WelcomeModal from '../ui/WelcomeModal.jsx';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { cn } from '../../utils/cn.js';

export default function AdminLayout() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const { profile } = useAuthContext();
  const { showWelcomeModal, setShowWelcomeModal } = useUiStore();

  // Show welcome modal on first login
  useEffect(() => {
    const key = `edunexus-welcomed-${profile?.id}`;
    if (!localStorage.getItem(key)) {
      setShowWelcomeModal(true);
      localStorage.setItem(key, '1');
    }
  }, [profile?.id, setShowWelcomeModal]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-2xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Welcome modal */}
      {showWelcomeModal && (
        <WelcomeModal onClose={() => setShowWelcomeModal(false)} />
      )}
    </div>
  );
}
