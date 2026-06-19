import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';
import { ErrorFactory } from './error/ErrorFactory';

/**
 * 安全获取环境变量
 * 兼容 Vite (import.meta.env) 和 Node.js (process.env)
 */
const getEnv = (key: string, required: boolean = true): string => {
  // Statically check keys for robust Vite production compilation
  if (key === 'VITE_SUPABASE_URL') {
    return import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : '') || '';
  }
  if (key === 'VITE_SUPABASE_ANON_KEY') {
    return import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : '') || '';
  }
  if (key === 'NODE_ENV') {
    return import.meta.env.MODE || (typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : '') || 'production';
  }

  // Fallback to dynamic checking
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // 降级使用 process.env（运行时）
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // 既没有 import.meta.env 也没有 process.env
  if (required) {
    logger.error(`❌ 环境变量 ${key} 未找到`);
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// 验证环境变量
let isSupabaseConfigured = true;
if (!supabaseUrl || !supabaseAnonKey) {
  logger.error(`Missing Supabase environment variables.`);
  isSupabaseConfigured = false;
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: (url, options) => {
      const signal = AbortSignal.timeout(30000);
      return fetch(url, { ...options, signal });
    }
  }
}) : (new Proxy({}, {
  get: () => {
    throw ErrorFactory.wrap(new Error("Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment/secrets."), 'supabaseInitialization');
  }
}) as any);

// 开发环境挂载到 window，方便调试（可选）
if (typeof window !== 'undefined' && getEnv('NODE_ENV', false) === 'development') {
  (window as any).supabase = supabase;
}

