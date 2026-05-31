import React, { useCallback } from 'react';
import { toast } from '@/lib/ui/toast';
import { logErrorToSupabase } from '@/services/logService';
import * as ErrorMonitor from '@sentry/react';

export function extractErrorMessage(error: any): string {
  if (!error) return '未知错误';
  if (typeof error === 'string') return error;
  
  try {
    if (typeof error === 'object') {
      // 1. Check for detailed network response structures
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
      // 2. Parse raw response text if is an error string
      if (typeof error.response?.data === 'string') {
        try {
          const parsed = JSON.parse(error.response.data);
          if (parsed?.error?.message) return parsed.error.message;
          if (parsed?.message) return parsed.message;
        } catch (_) {}
        return error.response.data;
      }
      // 3. Stringified messages from custom errors (e.g. JSON returned)
      if (typeof error.message === 'string') {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed?.error?.message) return parsed.error.message;
          if (parsed?.message) return parsed.message;
        } catch (_) {}
        return error.message;
      }
    }
  } catch (_) {}
  
  if (error instanceof Error) {
    return error.message;
  }
  
  try {
    return JSON.stringify(error);
  } catch (_) {
    return String(error);
  }
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

  console.error(`[PhotoX Core Error] [${context}] Detailed Info:`, {
    rawError: error,
    message,
    stack: error instanceof Error ? error.stack : (error?.stack || undefined),
    timestamp: new Date().toISOString()
  });

  // Capture in GlitchTip/ErrorMonitor safely
  try {
    ErrorMonitor.captureException(error instanceof Error ? error : new Error(message));
  } catch (e) {
    console.error('Error in error reporting service:', e);
  }
  
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
