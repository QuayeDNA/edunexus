import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext.jsx';

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
  const { profile, role, loading, initialized } = useAuthContext();

  // Still loading profile — wait
  if (!initialized || loading) return null;

  // Profile has a school_id → onboarding is complete, go to dashboard
  if (profile?.school_id) {
    const roleDashboards = {
      admin:       '/admin/dashboard',
      super_admin: '/admin/dashboard',
      teacher:     '/teacher/dashboard',
      student:     '/student/dashboard',
      parent:      '/parent/dashboard',
    };
    return <Navigate to={roleDashboards[role] ?? '/admin/dashboard'} replace />;
  }

  // No school_id yet → show onboarding
  return children;
};

export default OnboardingGuard;