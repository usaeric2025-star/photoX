import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbpnlkeweqkjufijtdph.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => {
        // [SYNC-STORAGE-IN-RENDER] @ src/lib/supabase.ts:16
        setTimeout(() => window.localStorage.setItem(key, value), 0);
      },
      removeItem: (key) => {
        setTimeout(() => window.localStorage.removeItem(key), 0);
      }
    }
  },
  global: {
    fetch: (url, options) => {
      const signal = AbortSignal.timeout(30000);
      return fetch(url, { ...options, signal });
    }
  }
});
