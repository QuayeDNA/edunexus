import { supabase } from '../supabaseClient';

export const authApi = {
  /**
   * Sign in with email and password
   */
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign in with magic link (passwordless)
   */
  signInWithMagicLink: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  },

  /**
   * Sign up new user (creates auth user + profile)
   */
  signUp: async (email, password, profileData) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Send password reset email
   */
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/reset-password` }
    );
    if (error) throw error;
  },

  /**
   * Update password (after reset or for logged-in user)
   */
  updatePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get profile for the currently logged-in user
   */
  getProfile: async (userId) => {
  try {
    // ✅ IMPROVED: Better error handling and logging
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      // PGRST116 = no rows found, which is OK for new users
      if (error.code === 'PGRST116') {
        console.warn('⚠️ [API] No profile found for user, returning null:', userId);
        return null;
      }
      console.error('❌ [API] getProfile error:', error);
      throw error;
    }
    
    console.log('✅ [API] Profile loaded successfully:', data?.id);
    return data;
  } catch (err) {
    console.error('❌ [API] getProfile exception:', err.message);
    throw err;
  }
},

  /**
   * Create initial admin profile after registration
   */
  createAdminProfile: async ({ userId, schoolId, firstName, lastName, phone }) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        school_id: schoolId,
        role: 'admin',
        first_name: firstName,
        last_name: lastName,
        phone,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
