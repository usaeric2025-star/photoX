import { createClient } from '@supabase/supabase-js';

/**
 * 安全获取环境变量
 * 兼容 Vite (import.meta.env) 和 Node.js (process.env)
 */
const getEnv = (key: string): string => {
  // 优先使用 Vite 的 import.meta.env（构建时注入）
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // 降级使用 process.env（运行时）
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // 既没有 import.meta.env 也没有 process.env
  console.error(`❌ 环境变量 ${key} 未找到`);
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://vbpnlkeweqkjufijtdph.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8';

// 验证环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase environment variables.\n` +
    `VITE_SUPABASE_URL: ${!!supabaseUrl}\n` +
    `VITE_SUPABASE_ANON_KEY: ${!!supabaseAnonKey}`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
  },
  global: {
    fetch: (url, options) => {
      const signal = AbortSignal.timeout(30000);
      return fetch(url, { ...options, signal });
    }
  }
});

// 开发环境挂载到 window，方便调试（可选）
if (typeof window !== 'undefined' && getEnv('NODE_ENV') === 'development') {
  (window as any).supabase = supabase;
}

