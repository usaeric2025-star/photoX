import React, { useCallback } from 'react';
import { toast } from '@/lib/ui/toast';
import { logErrorToSupabase } from '@/services/logService';

export function extractErrorMessage(error: any): string {
  if (!error) return '未知错误';
  if (typeof error === 'string') return error;

  // Helper safely finding clean nested string messages
  const getMessage = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (typeof val.message === 'string') return val.message;
      if (typeof val.error === 'string') return val.error;
      if (val.message && typeof val.message === 'object') {
        const nested = getMessage(val.message);
        if (nested) return nested;
      }
    }
    return null;
  };

  try {
    if (typeof error === 'object') {
      // 1. Direct checking for structured response or network formats
      if (error.response?.data?.error?.message) {
        return String(error.response.data.error.message);
      }
      if (error.response?.data?.message) {
        return String(error.response.data.message);
      }
      if (error.error?.message) {
        return String(error.error.message);
      }
      if (error.error && typeof error.error === 'string') {
        return error.error;
      }
      if (error.message && typeof error.message === 'string') {
        // Double check JSON stringified formats
        try {
          const parsed = JSON.parse(error.message);
          if (parsed?.error?.message) return String(parsed.error.message);
          if (parsed?.message) return String(parsed.message);
        } catch (_) {}
        return error.message;
      }
      
      const foundMsg = getMessage(error.message) || getMessage(error.error) || getMessage(error);
      if (foundMsg) return foundMsg;

      // Status codes and details
      if (error.statusText) {
        return `${error.statusText} (Status: ${error.status || 'unknown'})`;
      }
      if (error.code) {
        return `Error Code: ${error.code} ${error.details || ''}`;
      }
    }
  } catch (_) {}

  if (error instanceof Error && error.message) {
    return error.message;
  }

  // Safe fallback serialization avoiding circular dependencies
  try {
    const cache = new Set();
    const str = JSON.stringify(error, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);
      }
      return value;
    });
    if (str && str !== '{}') return str;
  } catch (_) {}

  // If even that fails or is empty, stringify keys and values
  try {
    if (typeof error === 'object') {
      const keys = Object.keys(error);
      if (keys.length > 0) {
        return `[Object Error] Keys: ${keys.join(', ')} | Stringified: ${String(error)}`;
      }
    }
  } catch (_) {}

  return String(error);
}

export const globalHandleError = (error: any, context: string, silent: boolean = false) => {
  const message = extractErrorMessage(error);
  
  if (
    message.includes('ResizeObserver') || 
    message.includes('loop limit exceeded') || 
    message.includes('ResizeObserver loop completed') ||
    /ResizeObserver/i.test(message)
  ) {
    console.warn(`[PhotoX Core Suppressed Error] ${message}`);
    return;
  }

  // Gracefully handle Vite dynamic import / Chunk Load Errors from redeployment
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('dynamically imported module') ||
    /dynamically imported module/i.test(message)
  ) {
    const RELOAD_KEY = 'photo_x_chunk_reload_attempts';
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 15000) {
      sessionStorage.setItem(RELOAD_KEY, String(now));
      toast.info('系统已检测到有最新更新，正在为您自动刷新页面并同步新版本...', { duration: 5000 });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      return;
    }
  }

  console.error(`[PhotoX Core Error] [${context}] Detailed Info:`, {
    rawError: error,
    message,
    stack: error instanceof Error ? error.stack : (error?.stack || undefined),
    timestamp: new Date().toISOString()
  });

  // Capture in GlitchTip/ErrorMonitor safely
  // try {
  //   ErrorMonitor.captureException(error instanceof Error ? error : new Error(message));
  // } catch (e) {
  //   console.error('Error in error reporting service:', e);
  // }
  
  // UI Toast Notification with Diagnostic Clipboard Copy
  if (!silent) {
    try {
        toast.dismiss();
        toast.error(`出错了 [${context}]`, {
          description: (
            typeof window !== 'undefined' ? (
              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-[11px] text-red-700 font-mono break-all line-clamp-3 bg-red-50/50 p-1.5 rounded border border-red-100/50">{message}</p>
                <button 
                  onClick={() => {
                    const tv = typeof error === 'object' && error !== null;
                    const truncatedStack = error instanceof Error && error.stack
                      ? error.stack.split('\n').slice(0, 5).join('\n') // Keep top 5 frames for readability
                      : (error?.stack ? String(error.stack).split('\n').slice(0, 5).join('\n') : '');
                    
                    const simpleReport = [
                      `🚨 【错误信息 / Error】: ${message}`,
                      `📌 【发生位置 / Context】: ${context} (${window.location.pathname})`,
                      truncatedStack ? `🥞 【堆栈痕迹 / Stack Trace (Top 5)】:\n${truncatedStack}` : '',
                      `🕒 【触发时间 / Time】: ${new Date().toLocaleString()}`
                    ].filter(Boolean).join('\n\n');

                    navigator.clipboard.writeText(simpleReport)
                      .then(() => toast.success('诊断报告已复制，可提交给管理员！'))
                      .catch(() => {});
                  }}
                  className="self-start text-[9px] font-bold text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-50 font-sans tracking-wide px-2 py-0.5 rounded-full mt-1 flex items-center gap-1 transition animate-pulse"
                  id="diag-btn"
                >
                  📋 复制详细错误诊断
                </button>
              </div>
            ) : String(message)
          ),
          duration: 10000
        });
    } catch(e) {
        console.error('Error in toast notification:', e);
    }
  }
  
  // Log to Supabase for Audit
  try {
      const errorObj = error instanceof Error ? error : new Error(message);
      logErrorToSupabase(errorObj, error, { context, silent, timestamp: new Date().toISOString() }).catch(err => {
        console.error('Failed to log error to Supabase:', err);
      });
  } catch(e) {
      console.error('Error in logging to Supabase:', e);
  }
};

export const useErrorHandler = () => {
  const handleError = useCallback((error: any, context: string, silent: boolean = false) => {
    globalHandleError(error, context, silent);
  }, []);
  return { handleError };
};
