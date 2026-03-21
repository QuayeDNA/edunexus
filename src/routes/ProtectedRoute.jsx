import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext.jsx';

/**
 * ProtectedRoute — guards routes by authentication and optional role check.
 *
 * Usage:
 *   <ProtectedRoute>                          // auth only
 *   <ProtectedRoute allowedRoles={['admin']}> // auth + role
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, loading, initialized, needsOnboarding } = useAuthContext();
  const location = useLocation();

  // Still initialising auth state — show nothing (avoids flash)
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
              <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
              <circle cx="16" cy="18" r="3" fill="#10B981" />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but school setup not complete → redirect to onboarding
  // (unless we're already on the onboarding page)
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Authenticated but role not allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the appropriate dashboard for their role
    const roleDashboards = {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
      parent: '/parent/dashboard',
    };
    const destination = roleDashboards[role] ?? '/login';
    return <Navigate to={destination} replace />;
  }

  return children;
};

export default ProtectedRoute;
