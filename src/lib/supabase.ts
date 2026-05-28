import { createClient } from '@supabase/supabase-js';
import { clientEnv } from '../shared/envSchema';

const supabaseUrl = 'https://vbpnlkeweqkjufijtdph.supabase.co';
const supabaseAnonKey = clientEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8';

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
      getItem: (key) => typeof window !== 'undefined' ? window.localStorage.getItem(key) : null,
      setItem: (key, value) => {
        // [SYNC-STORAGE-IN-RENDER] @ src/lib/supabase.ts:16
        if (typeof window !== 'undefined') {
          setTimeout(() => window.localStorage.setItem(key, value), 0);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          setTimeout(() => window.localStorage.removeItem(key), 0);
        }
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
