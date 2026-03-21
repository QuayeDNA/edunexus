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
  const { isAuthenticated, role, loading, initialized } = useAuthContext();
  const location = useLocation();

  // Still initialising — show branded splash to avoid flash
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

  // Not logged in → send to login, saving intended path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role → redirect to their own dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const roleDashboards = {
      admin:       '/admin/dashboard',
      super_admin: '/admin/dashboard',
      teacher:     '/teacher/dashboard',
      student:     '/student/dashboard',
      parent:      '/parent/dashboard',
    };
    return <Navigate to={roleDashboards[role] ?? '/login'} replace />;
  }

  // Logged in but profile not loaded yet (role is null) — wait
  if (allowedRoles && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;