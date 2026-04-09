import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext.jsx';
import { APP_ROUTES, getRoleDashboardRoute, ROLES } from '../utils/constants.js';

/**
 * OnboardingGuard
 *
 * Allows access to /onboarding ONLY when the user is authenticated but their
 * school record has not been fully configured yet (no school_id on profile,
 * or the profile is brand-new from registration).
 *
 * If the school is already set up, redirect straight to the dashboard.
 */
const OnboardingGuard = ({ children }) => {
  const {
    profile,
    role,
    loading,
    initialized,
    profileStatus,
    profileError,
    refreshProfile,
    signOut,
  } = useAuthContext();

  if (!initialized || loading || profileStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (profileStatus === 'error' || profileStatus === 'missing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Could not load profile for onboarding</h2>
            <p className="text-sm text-text-secondary mt-1">
              {profileError?.message ?? 'Retry profile sync or sign out and sign in again.'}
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

  // Platform super admin accounts are cross-school and do not use onboarding.
  if (role === ROLES.SUPER_ADMIN) {
    return <Navigate to={APP_ROUTES.SUPER_ADMIN_DASHBOARD} replace />;
  }

  // Profile has a school_id → onboarding is complete, go to dashboard
  if (profile?.school_id) {
    return <Navigate to={getRoleDashboardRoute(role)} replace />;
  }

  // No school_id yet → show onboarding
  return children;
};

export default OnboardingGuard;