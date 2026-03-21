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
        // ✅ ADDED: 10 second timeout to prevent indefinite hanging
        const profilePromise = authApi.getProfile(userId);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout after 10s')), 10000)
        );
        
        const profileData = await Promise.race([profilePromise, timeoutPromise]);
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
          try {
            if (currentUser) {
              setUser(currentUser);
              await loadProfile(currentUser.id);
            } else {
              setUser(null);
              setProfile(null);
            }
          } catch (err) {
            console.error('❌ [Auth] Failed to restore session on page load:', err);
            setUser(null);
            setProfile(null);
          } finally {
            // ✅ CRITICAL: Always mark auth as ready, even if profile load fails.
            // This prevents the app from being stuck in loading state.
            setLoading(false);
            setInitialized(true);
          }

        } else if (event === 'SIGNED_IN') {
          setUser(currentUser);
          if (currentUser) {
            setLoading(true);
            try {
              await loadProfile(currentUser.id);
            } catch (err) {
              console.error('❌ [Auth] Failed to load profile after sign-in:', err);
              setProfile(null);
            } finally {
              setLoading(false);
            }
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
            try {
              await loadProfile(currentUser.id);
            } catch (err) {
              console.error('❌ [Auth] Failed to update profile:', err);
              setProfile(null);
            }
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