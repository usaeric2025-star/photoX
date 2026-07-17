import { logger } from '#lib/logger.js';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '#lib/env.js';

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const mode = getEnv('MODE');

// 验证环境变量
export let isSupabaseConfigured = true;
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-url.supabase.co')) {
  logger.error(`Missing or invalid Supabase environment variables.`);
  isSupabaseConfigured = false;
}

const dummyAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithOAuth: async () => {
    logger.error("Supabase environment variables are missing; OAuth login is unavailable.");
    throw new Error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  },
  signOut: async () => {}
};

// 遞迴的防崩潰安全 Proxy 產生器，支持鏈式調用：supabase.from('x').select('*').eq(...)
const makeSafeProxy = (path: string[] = []): any => {
  const targetFn = () => {};
  return new Proxy(targetFn, {
    get: (_target, prop) => {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then') return undefined; // 避免 Promise await 陷阱
      if (prop === 'auth') {
        return dummyAuth;
      }
      return makeSafeProxy([...path, String(prop)]);
    },
    apply: (_target, _thisArg, argArray) => {
      logger.warn(`[Supabase Mock] Called method: supabase.${path.join('.')}(${argArray.map(a => {
        try { return JSON.stringify(a); } catch { return String(a); }
      }).join(', ')})`);
      // 返回一個新的 SafeProxy，允許持續鏈式調用 .select().eq().order()
      return makeSafeProxy(path);
    }
  });
};

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        fetch: (url, options) => {
          const signal = typeof AbortSignal.timeout === 'function'
            ? AbortSignal.timeout(120000)
            : (() => {
                const controller = new AbortController();
                setTimeout(() => controller.abort(), 120000);
                return controller.signal;
              })();
          return fetch(url, { ...options, signal });
        }
      }
    }) 
  : (makeSafeProxy() as unknown as ReturnType<typeof createClient>);

// 开发环境挂载到 window，方便调试（可选）
if (typeof window !== 'undefined' && mode === 'development') {
  (window as unknown as { supabase: unknown }).supabase = supabase;
}
