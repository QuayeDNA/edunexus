import { Outlet, Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import {
  APP_NAME,
  APP_ROUTES,
  APP_TAGLINE,
  getRoleDashboardRoute,
} from '../../utils/constants.js';

export default function AuthLayout() {
  const {
    isAuthenticated,
    role,
    initialized,
    loading,
    profileStatus,
    profileError,
    refreshProfile,
    signOut,
  } = useAuthContext();

  // Session bootstrap loader
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isAuthenticated && role) {
    return <Navigate to={getRoleDashboardRoute(role)} replace />;
  }

  if (isAuthenticated && profileStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-text-muted">Loading your account profile...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && (profileStatus === 'error' || profileStatus === 'missing')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Could not restore account profile</h2>
            <p className="text-sm text-text-secondary mt-1">
              {profileError?.message ?? 'Please retry profile sync or sign out and sign in again.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshProfile} className="btn-primary text-sm">Retry</button>
            <button onClick={signOut} className="btn-secondary text-sm">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated, profile loaded, no role/school assignment yet.
  if (isAuthenticated) {
    return <Navigate to={APP_ROUTES.ONBOARDING} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 relative overflow-hidden flex-col justify-between p-12">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-brand-500 opacity-40" />
          <div className="absolute -bottom-32 -left-16 w-120 h-120 rounded-full bg-brand-700 opacity-50" />
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
