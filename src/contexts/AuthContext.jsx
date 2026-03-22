import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authApi } from '../services/api/auth';

const AuthContext = createContext(null);

const PROFILE_CACHE_KEY = 'edunexus:auth:profile-cache';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const PROFILE_FETCH_TIMEOUT_MS = 15 * 1000;

const safeReadProfileCache = () => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeProfileCache = (userId, profile) => {
  try {
    const payload = {
      userId,
      profile,
      cachedAt: Date.now(),
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode/quota)
  }
};

const clearProfileCache = () => {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore storage failures
  }
};

const withTimeout = (promise, timeoutMs, message) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Prevent duplicate profile fetches for the same userId
  const profileFetchRef = useRef(null);

  const loadProfile = useCallback(async (userId, options = {}) => {
    const { useTimeout = true } = options;

    // Already fetching for this user — return the in-flight promise
    if (profileFetchRef.current?.userId === userId) {
      return profileFetchRef.current.promise;
    }

    const promise = (async () => {
      try {
        const profilePromise = authApi.getProfile(userId);
        const profileData = useTimeout
          ? await withTimeout(profilePromise, PROFILE_FETCH_TIMEOUT_MS, `Profile fetch timeout after ${PROFILE_FETCH_TIMEOUT_MS / 1000}s`)
          : await profilePromise;

        setProfile(profileData);
        if (profileData) writeProfileCache(userId, profileData);
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

              // Hydrate immediately from cache to avoid blocking UI on every refresh.
              const cached = safeReadProfileCache();
              const isSameUser = cached?.userId === currentUser.id;
              const isFresh = isSameUser && Date.now() - (cached.cachedAt ?? 0) < PROFILE_CACHE_TTL_MS;

              if (isSameUser && cached.profile) {
                setProfile(cached.profile);
              }

              // Mark app ready immediately after session is restored.
              setLoading(false);
              setInitialized(true);

              // Revalidate profile only when cache is stale or missing.
              if (!isFresh) {
                void loadProfile(currentUser.id, { useTimeout: false });
              }
              return;
            } else {
              setUser(null);
              setProfile(null);
              clearProfileCache();
            }
          } catch (err) {
            console.error('❌ [Auth] Failed to restore session on page load:', err);
            setUser(null);
            setProfile(null);
            clearProfileCache();
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
          clearProfileCache();

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
      clearProfileCache();
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