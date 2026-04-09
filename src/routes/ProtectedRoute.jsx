import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext.jsx';
import { APP_ROUTES, getRoleDashboardRoute } from '../utils/constants.js';

const AuthLoadingScreen = ({ label }) => (
  <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
        <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
          <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
          <circle cx="16" cy="18" r="3" fill="#10B981" />
        </svg>
      </div>
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  </div>
);

const AuthRecoveryScreen = ({ message, onRetry, onSignOut }) => (
  <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
    <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">We could not load your account profile</h2>
        <p className="text-sm text-text-secondary mt-1">{message}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onRetry} className="btn-primary text-sm">Retry</button>
        <button onClick={onSignOut} className="btn-secondary text-sm">Sign out</button>
      </div>
    </div>
  </div>
);

/**
 * ProtectedRoute — guards routes by authentication and optional role check.
 *
 * Usage:
 *   <ProtectedRoute>                          // auth only
 *   <ProtectedRoute allowedRoles={['admin']}> // auth + role
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const {
    isAuthenticated,
    role,
    loading,
    initialized,
    profileStatus,
    profileError,
    refreshProfile,
    signOut,
  } = useAuthContext();
  const location = useLocation();

  // Still bootstrapping session
  if (!initialized || loading) {
    return <AuthLoadingScreen label="Restoring your session..." />;
  }

  // Not logged in -> send to login, saving intended path
  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (!allowedRoles) {
    return children;
  }

  // Logged in but wrong role -> redirect to their own dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleDashboardRoute(role, APP_ROUTES.LOGIN)} replace />;
  }

  // Role-dependent route but role is unavailable.
  if (!role) {
    if (profileStatus === 'loading') {
      return <AuthLoadingScreen label="Loading your account profile..." />;
    }

    if (profileStatus === 'error') {
      return (
        <AuthRecoveryScreen
          message={profileError?.message ?? 'Please retry profile sync or sign out and sign in again.'}
          onRetry={refreshProfile}
          onSignOut={signOut}
        />
      );
    }

    if (profileStatus === 'missing') {
      return (
        <AuthRecoveryScreen
          message="Your account exists but no profile record was found. Please sign out and sign in again."
          onRetry={refreshProfile}
          onSignOut={signOut}
        />
      );
    }

    return <AuthLoadingScreen label="Preparing your account..." />;
  }

  return children;
};

export default ProtectedRoute;