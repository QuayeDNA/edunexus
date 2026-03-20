import { Outlet } from 'react-router-dom';
import Header from '../ui/Header.jsx';
import TeacherSidebar from '../ui/TeacherSidebar.jsx';
import { useUiStore } from '../../store/uiStore.js';
import { cn } from '../../utils/cn.js';

export default function TeacherLayout() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      <TeacherSidebar />
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
