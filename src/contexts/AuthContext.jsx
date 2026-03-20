import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { authApi } from '../services/api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    try {
      const profileData = await authApi.getProfile(userId);
      setProfile(profileData);
      return profileData;
    } catch (err) {
      console.warn('Could not load profile:', err.message);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id).finally(() => {
          setLoading(false);
          setInitialized(true);
        });
      } else {
        setLoading(false);
        setInitialized(true);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          setLoading(true);
          await loadProfile(currentUser.id);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && currentUser) {
          // Silently refresh profile
          loadProfile(currentUser.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.signIn(email, password);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authApi.signOut();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

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
    role: profile?.role ?? null,
    schoolId: profile?.school_id ?? null,
    isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    isParent: profile?.role === 'parent',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};
