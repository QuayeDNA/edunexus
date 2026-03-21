import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authApi } from '../services/api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Guard against concurrent profile loads for the same user
  const loadingProfileFor = useRef(null);

  const loadProfile = useCallback(async (userId) => {
    if (loadingProfileFor.current === userId) return null; // already in flight
    loadingProfileFor.current = userId;
    try {
      const profileData = await authApi.getProfile(userId);
      setProfile(profileData);
      return profileData;
    } catch (err) {
      console.error('❌ [Auth] Could not load profile:', err.message);
      setProfile(null);
      return null;
    } finally {
      loadingProfileFor.current = null;
    }
  }, []);

  // ── Bootstrap: get the persisted session ONCE on mount ──────────────────────
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      } catch (err) {
        console.error('❌ [Auth] Bootstrap error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    bootstrap();

    // ── Listen for realtime auth events ────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;

        if (event === 'SIGNED_IN') {
          setUser(currentUser);
          setLoading(true);
          if (currentUser) {
            await loadProfile(currentUser.id);
          }
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && currentUser) {
          // Silently keep user in sync; don't flicker loading
          setUser(currentUser);
        } else if (event === 'USER_UPDATED' && currentUser) {
          setUser(currentUser);
          await loadProfile(currentUser.id);
        }
        // INITIAL_SESSION is handled by bootstrap above — ignore here
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ── signIn ──────────────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.signIn(email, password);
      // onAuthStateChange(SIGNED_IN) will set user + profile + loading=false
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // ── signOut ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    setLoading(true);
    try {
      await authApi.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  // ── refreshProfile ──────────────────────────────────────────────────────────
  const refreshProfile = async () => {
    if (user) return loadProfile(user.id);
  };

  const value = {
    user,
    profile,
    loading,
    initialized,
    signIn,
    signOut,
    refreshProfile,
    isAuthenticated: !!user,
    role:      profile?.role        ?? null,
    schoolId:  profile?.school_id   ?? null,
    isAdmin:   profile?.role === 'admin' || profile?.role === 'super_admin',
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    isParent:  profile?.role === 'parent',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};