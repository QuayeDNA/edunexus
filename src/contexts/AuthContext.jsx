import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authApi } from '../services/api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Prevent duplicate profile fetches for the same userId
  const profileFetchRef = useRef(null);

  const loadProfile = useCallback(async (userId) => {
    // Already fetching for this user — return the in-flight promise
    if (profileFetchRef.current?.userId === userId) {
      return profileFetchRef.current.promise;
    }

    const promise = (async () => {
      try {
        const profileData = await authApi.getProfile(userId);
        setProfile(profileData);
        return profileData;
      } catch (err) {
        console.error('❌ [Auth] Could not load profile:', err.message);
        setProfile(null);
        return null;
      } finally {
        profileFetchRef.current = null;
      }
    })();

    profileFetchRef.current = { userId, promise };
    return promise;
  }, []);

  useEffect(() => {
    /**
     * Use onAuthStateChange as the SINGLE source of truth.
     *
     * Supabase fires INITIAL_SESSION immediately on subscribe with the
     * persisted session (or null). This replaces any need for a separate
     * getSession() bootstrap call and avoids the React Strict Mode double-
     * effect race condition entirely.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;

        if (event === 'INITIAL_SESSION') {
          // Restore persisted session on page load / hard refresh
          if (currentUser) {
            setUser(currentUser);
            await loadProfile(currentUser.id);
          } else {
            setUser(null);
            setProfile(null);
          }
          // Mark auth as ready regardless of whether a session exists
          setLoading(false);
          setInitialized(true);

        } else if (event === 'SIGNED_IN') {
          setUser(currentUser);
          if (currentUser) {
            setLoading(true);
            await loadProfile(currentUser.id);
            setLoading(false);
          }

        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);

        } else if (event === 'TOKEN_REFRESHED') {
          // Token silently refreshed — update user object, no loading flicker
          if (currentUser) setUser(currentUser);

        } else if (event === 'USER_UPDATED') {
          if (currentUser) {
            setUser(currentUser);
            await loadProfile(currentUser.id);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // ── signIn ──────────────────────────────────────────────────────────────────
  // We set loading=true here; the SIGNED_IN event will load profile + clear it.
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      return await authApi.signIn(email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ── signOut ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    setLoading(true);
    try {
      await authApi.signOut();
    } finally {
      // SIGNED_OUT event will also clear state, but be defensive here too
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  // ── refreshProfile ──────────────────────────────────────────────────────────
  const refreshProfile = () => {
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
    role:      profile?.role ?? null,
    schoolId:  profile?.school_id ?? null,
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