import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    'Copy .env.example to .env.local and fill in your Supabase credentials, then restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    // ⚠️ No custom storageKey — Supabase writes and reads sessions under
    // 'sb-<project-ref>-auth-token' by default. Setting a custom key causes
    // a silent mismatch: the token is written correctly on login but the
    // auth client can't find it on page load, so INITIAL_SESSION fires with
    // session=null and the app thinks no one is logged in.
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;