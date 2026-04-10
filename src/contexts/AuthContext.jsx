import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authApi } from '../services/api/auth';
import { ROLES } from '../utils/constants.js';

const AuthContext = createContext(null);

const PROFILE_CACHE_KEY = 'edunexus:auth:profile-cache:v2';
const PROFILE_CACHE_TTL_MS = 30 * 60 * 1000;
const PROFILE_FETCH_TIMEOUT_MS = 8 * 1000;
const PROFILE_FETCH_RETRIES = 2;
const PROFILE_RETRY_DELAY_MS = 1200;

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
      version: 2,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readCachedProfileForUser = (userId) => {
  const cached = safeReadProfileCache();
  if (!cached || cached.userId !== userId || !cached.profile) {
    return { profile: null, isFresh: false };
  }

  const age = Date.now() - (cached.cachedAt ?? 0);
  return {
    profile: cached.profile,
    isFresh: age < PROFILE_CACHE_TTL_MS,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState('idle');
  const [profileError, setProfileError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Prevent duplicate profile fetches for the same userId
  const profileFetchRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setProfileStatus('idle');
    setProfileError(null);
    profileFetchRef.current = null;
    clearProfileCache();
  }, []);

  const loadProfile = useCallback(async (userId, options = {}) => {
    const {
      useTimeout = true,
      retries = PROFILE_FETCH_RETRIES,
      background = false,
      force = false,
    } = options;

    if (!userId) return null;

    // Already fetching for this user — return the in-flight promise
    if (!force && profileFetchRef.current?.userId === userId) {
      return profileFetchRef.current.promise;
    }

    if (!background) {
      setProfileStatus('loading');
    }
    setProfileError(null);

    const request = (async () => {
      let attempt = 0;
      let lastError = null;

      while (attempt <= retries) {
        try {
          const profilePromise = authApi.getProfile(userId);
          const profileData = useTimeout
            ? await withTimeout(
                profilePromise,
                PROFILE_FETCH_TIMEOUT_MS,
                `Profile fetch timeout after ${PROFILE_FETCH_TIMEOUT_MS / 1000}s`
              )
            : await profilePromise;

          if (!profileData) {
            setProfile(null);
            clearProfileCache();
            setProfileStatus('missing');
            return null;
          }

          // Check if user's school is active (if they have one)
          if (profileData.school_id && profileData.role !== 'super_admin') {
            try {
              const { data: schoolData, error: schoolError } = await supabase
                .from('schools')
                .select('lifecycle_status')
                .eq('id', profileData.school_id)
                .single();

              if (schoolError) {
                console.error('Failed to check school status:', schoolError);
              } else if (schoolData?.lifecycle_status !== 'active') {
                // School is suspended, sign out the user
                await supabase.auth.signOut();
                setProfileError(new Error('Your school account has been suspended. Please contact support.'));
                setProfileStatus('error');
                return null;
              }
            } catch (err) {
              console.error('Error checking school status:', err);
              // Continue with login even if school check fails
            }
          }

          setProfile(profileData);
          writeProfileCache(userId, profileData);
          setProfileStatus('ready');
          setProfileError(null);
          return profileData;
        } catch (err) {
          lastError = err;
          attempt += 1;

          if (attempt <= retries) {
            await sleep(PROFILE_RETRY_DELAY_MS * attempt);
          }
        }
      }

      console.error('❌ [Auth] Could not load profile:', lastError?.message ?? lastError);
      setProfileError(lastError);

      // Keep the last known good profile to avoid route deadlocks.
      setProfileStatus(profileRef.current ? 'ready' : 'error');
      return null;
    })();

    profileFetchRef.current = { userId, promise: request };

    request.finally(() => {
      if (profileFetchRef.current?.promise === request) {
        profileFetchRef.current = null;
      }
    });

    return request;
  }, []);

  const handleAuthEvent = useCallback(
    async (event, session) => {
      const currentUser = session?.user ?? null;

      if (event === 'INITIAL_SESSION') {
        if (!currentUser) {
          clearAuthState();
          setInitialized(true);
          return;
        }

        setUser(currentUser);

        const cached = readCachedProfileForUser(currentUser.id);
        if (cached.profile) {
          setProfile(cached.profile);
          setProfileStatus('ready');
        } else {
          setProfile(null);
          setProfileStatus('loading');
        }

        setProfileError(null);
        setInitialized(true);

        if (!cached.isFresh) {
          void loadProfile(currentUser.id, {
            useTimeout: true,
            retries: PROFILE_FETCH_RETRIES,
            background: !!cached.profile,
            force: true,
          });
        }
        return;
      }

      if (event === 'SIGNED_IN') {
        if (!currentUser) {
          clearAuthState();
          setInitialized(true);
          return;
        }

        setUser(currentUser);
        setInitialized(true);
        setProfileError(null);

        const cached = readCachedProfileForUser(currentUser.id);
        if (cached.profile) {
          setProfile(cached.profile);
          setProfileStatus('ready');
        } else {
          setProfile(null);
          setProfileStatus('loading');
        }

        void loadProfile(currentUser.id, {
          useTimeout: true,
          retries: PROFILE_FETCH_RETRIES,
          background: false,
          force: true,
        });
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (currentUser) {
          setUser(currentUser);
        }
        return;
      }

      if (event === 'USER_UPDATED') {
        if (currentUser) {
          setUser(currentUser);
          void loadProfile(currentUser.id, {
            useTimeout: true,
            retries: 1,
            background: true,
            force: true,
          });
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearAuthState();
        setInitialized(true);
      }
    },
    [clearAuthState, loadProfile]
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        void handleAuthEvent(event, session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleAuthEvent]);

  const signIn = async (email, password) => {
    return authApi.signIn(email, password);
  };

  const signOut = async () => {
    try {
      await authApi.signOut();
    } finally {
      clearAuthState();
      setInitialized(true);
    }
  };

  const refreshProfile = () => {
    if (!user?.id) return null;
    return loadProfile(user.id, {
      useTimeout: true,
      retries: 1,
      background: false,
      force: true,
    });
  };

  const loading = !initialized;
  const role = profile?.role ?? null;
  const schoolId = profile?.school_id ?? null;
  const profileLoading = profileStatus === 'loading';
  const profileReady = profileStatus === 'ready';
  const profileMissing = profileStatus === 'missing';
  const hasProfileIssue = profileStatus === 'error' || profileStatus === 'missing';

  const value = {
    user,
    profile,
    loading,
    initialized,
    profileStatus,
    profileError,
    profileLoading,
    profileReady,
    profileMissing,
    hasProfileIssue,
    signIn,
    signOut,
    refreshProfile,
    isAuthenticated: !!user,
    role,
    schoolId,
    isAdmin: role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,
    isTeacher: role === ROLES.TEACHER,
    isStudent: role === ROLES.STUDENT,
    isParent: role === ROLES.PARENT,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};