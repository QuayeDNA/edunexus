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
  const { isAuthenticated, role, loading, initialized, profile, user } = useAuthContext();
  const location = useLocation();

  // DEBUG: Log everything
  console.log('🔐 [ProtectedRoute] Current state:', {
    isAuthenticated,
    role,
    loading,
    initialized,
    profileSchoolId: profile?.school_id,
    userId: user?.id,
    allowedRoles,
    currentPath: location.pathname,
  });

  // Still initialising auth state — show nothing (avoids flash)
  if (!initialized || loading) {
    console.log('⏳ [ProtectedRoute] Still loading...');
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
    console.log('❌ [ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ [ProtectedRoute] User is authenticated');

  // Authenticated but role not allowed
  if (allowedRoles && !allowedRoles.includes(role)) {
    console.warn('⚠️ [ProtectedRoute] Role mismatch!', {
      userRole: role,
      allowedRoles,
    });

    // Redirect to the appropriate dashboard for their role
    const roleDashboards = {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
      parent: '/parent/dashboard',
    };
    const destination = roleDashboards[role] ?? '/login';
    console.log(`🔀 [ProtectedRoute] Redirecting to: ${destination}`);
    return <Navigate to={destination} replace />;
  }

  console.log('✅ [ProtectedRoute] Access granted, rendering children');
  return children;
};

export default ProtectedRoute;