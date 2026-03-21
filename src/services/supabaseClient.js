import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase environment variables not set. ' +
    'Copy .env.example to .env.local and fill in your Supabase project credentials.\n' +
    '   Find them in: Supabase Dashboard → Project Settings → Data API'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'edunexus-auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export default supabase;
