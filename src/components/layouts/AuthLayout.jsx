import { Outlet, Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { APP_NAME, APP_TAGLINE } from '../../utils/constants.js';

export default function AuthLayout() {
  const { isAuthenticated, role, initialized } = useAuthContext();

  // Redirect already-authenticated users to their dashboard
  if (initialized && isAuthenticated && role) {
    const dashboards = {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
      parent: '/parent/dashboard',
    };
    return <Navigate to={dashboards[role] ?? '/admin/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 relative overflow-hidden flex-col justify-between p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-brand-500 opacity-40" />
          <div className="absolute -bottom-32 -left-16 w-[480px] h-[480px] rounded-full bg-brand-700 opacity-50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-brand-400 opacity-20" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
                <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
                <circle cx="16" cy="18" r="3" fill="#10B981" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">{APP_NAME}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            The modern platform for<br />
            <span className="text-accent-300">every school</span> in Africa
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed">
            {APP_TAGLINE}
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: '🎓', label: 'Student Management' },
            { icon: '📊', label: 'Real-time Analytics' },
            { icon: '💳', label: 'Mobile Money Fees' },
            { icon: '📋', label: 'Ghana Report Cards' },
            { icon: '📱', label: 'Parent Portal' },
            { icon: '🌍', label: 'Works Offline' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="text-xl">{icon}</span>
              <span className="text-sm text-white/80 font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-brand-300 text-xs">
            © {new Date().getFullYear()} {APP_NAME} · Built for K-12 schools across Ghana and West Africa
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-surface-muted">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
              <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
              <circle cx="16" cy="18" r="3" fill="#10B981" />
            </svg>
          </div>
          <span className="text-lg font-bold text-text-primary">{APP_NAME}</span>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
