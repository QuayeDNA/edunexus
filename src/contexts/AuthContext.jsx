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
    console.log('👤 [Auth] Loading profile for user:', userId);
    try {
      const profileData = await authApi.getProfile(userId);
      console.log('✅ [Auth] Profile loaded:', profileData);
      setProfile(profileData);
      return profileData;
    } catch (err) {
      console.error('❌ [Auth] Could not load profile:', err.message);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log('🔄 [Auth] Initializing auth context...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      console.log('👤 [Auth] Initial session:', currentUser ? 'User found' : 'No user');
      
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id).finally(() => {
          setLoading(false);
          setInitialized(true);
          console.log('✅ [Auth] Initialization complete');
        });
      } else {
        setLoading(false);
        setInitialized(true);
        console.log('✅ [Auth] Initialization complete (no user)');
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 [Auth] Auth state changed:', event);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          console.log('✅ [Auth] User signed in, loading profile...');
          // DON'T set loading=true here - it causes the hang!
          // Just load the profile silently
          await loadProfile(currentUser.id);
          console.log('✅ [Auth] Sign-in complete');
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 [Auth] User signed out');
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && currentUser) {
          console.log('🔄 [Auth] Token refreshed, reloading profile');
          // Silently refresh profile
          loadProfile(currentUser.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email, password) => {
    console.log('🔐 [Auth] Signing in...');
    setLoading(true);
    try {
      const data = await authApi.signIn(email, password);
      console.log('✅ [Auth] Sign in successful');
      return data;
    } catch (error) {
      console.error('❌ [Auth] Sign in failed:', error);
      throw error;
    } finally {
      // Keep loading true - the onAuthStateChange will handle setting it to false
      // after profile loads
    }
  };

  const signOut = async () => {
    console.log('👋 [Auth] Signing out...');
    setLoading(true);
    try {
      await authApi.signOut();
      setUser(null);
      setProfile(null);
      console.log('✅ [Auth] Sign out complete');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = () => {
    if (user) {
      console.log('🔄 [Auth] Refreshing profile...');
      return loadProfile(user.id);
    }
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

  console.log('📊 [Auth] Current state:', {
    hasUser: !!user,
    hasProfile: !!profile,
    role: value.role,
    loading,
    initialized,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};