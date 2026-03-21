import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient.js';

/**
 * AuthCallbackPage
 *
 * Handles redirects from Supabase Auth for:
 *   - Magic link sign-in
 *   - Email confirmation after registration
 *   - OAuth provider callbacks
 *
 * Supabase (with PKCE flow) exchanges the code in the URL for a session,
 * then this page redirects the user to the right destination.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    // onAuthStateChange fires once the PKCE code exchange completes.
    // We listen for the first SIGNED_IN event and route accordingly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();

          // Fetch the user's profile to determine where to redirect them
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, school_id, first_name, last_name')
            .eq('id', session.user.id)
            .single();

          if (!profile?.school_id) {
            // New user — needs to complete onboarding
            navigate('/onboarding', { replace: true });
          } else {
            const roleDashboards = {
              admin:       '/admin/dashboard',
              super_admin: '/admin/dashboard',
              teacher:     '/teacher/dashboard',
              student:     '/student/dashboard',
              parent:      '/parent/dashboard',
            };
            navigate(roleDashboards[profile?.role] ?? '/admin/dashboard', { replace: true });
          }
        }

        if (event === 'PASSWORD_RECOVERY') {
          subscription.unsubscribe();
          navigate('/auth/reset-password', { replace: true });
        }
      }
    );

    // Fallback: if no auth event fires within 10 s, show an error
    const CALLBACK_TIMEOUT_MS = 10_000;
    const timer = setTimeout(() => {
      setError('The confirmation link has expired or is invalid. Please try again.');
    }, CALLBACK_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-status-dangerBg flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-status-danger" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Link expired</h2>
        <p className="text-text-secondary text-sm mb-6">{error}</p>
        <a href="/login" className="btn-primary inline-flex">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="text-center animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="text-text-secondary text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
