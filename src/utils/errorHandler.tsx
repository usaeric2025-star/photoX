import React, { useCallback } from 'react';
import { useGalleryStore } from '../store';
import { toast } from 'sonner';
import { logErrorToSupabase } from '../services/logService';
import * as ErrorMonitor from '@sentry/react';

export const globalHandleError = (error: any, context: string, silent: boolean = false) => {
  console.error(`[Error] ${context}:`, error);

  // Capture in GlitchTip/ErrorMonitor safely
  try {
    ErrorMonitor.captureException(error);
  } catch (e) {
    console.error('Error in error reporting:', e);
  }

  // Determine message safely
  let message = '';
  try {
      if (typeof error === 'string') {
          message = error;
      } else if (error instanceof Error) {
          message = error.message;
      } else if (error && typeof error === 'object' && error.message) {
          message = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
      } else {
          message = JSON.stringify(error);
      }
  } catch(e) {
      message = '无法解析错误信息';
  }
  
  // Store Error for Local Audit & Diagnostic Dashboard
  try {
      const state = useGalleryStore.getState();
      const currentErrors = state.errors || [];
      const newErr = { 
        id: Math.random().toString(36).substring(2, 11),
        message, 
        stack: error instanceof Error ? error.stack : undefined,
        context, 
        timestamp: Date.now() 
      };
      useGalleryStore.setState({ 
        errors: [newErr, ...currentErrors].slice(0, 20) 
      });
  } catch(e) {
      console.error('Error in storing error log:', e);
  }

  // UI Toast Notification with Diagnostic Clipboard Copy
  if (!silent) {
    try {
        toast.dismiss();
        toast.error(`${context}`, {
          description: (
            typeof window !== 'undefined' ? (
              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-[11px] text-slate-500 line-clamp-2">{message}</p>
                <button 
                  onClick={() => {
                    const errorReport = {
                      platform: 'PhotoX Core',
                      error: message,
                      context,
                      stack: error instanceof Error ? error.stack : undefined,
                      url: window.location.href,
                      ua: navigator.userAgent,
                      viewport: `${window.innerWidth}x${window.innerHeight}`,
                      timestamp: new Date().toISOString(),
                      errorsInSession: useGalleryStore.getState().errors || [],
                    };
                    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
                      .then(() => toast.success('物理诊断报告已成功复制到剪贴板！'))
                      .catch(() => {
                        console.log('Clipboard copy failed, fallback to alert trace.');
                      });
                  }}
                  className="self-start text-[9px] font-bold text-blue-600 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 font-sans tracking-wide px-2 py-0.5 rounded-full mt-1 flex items-center gap-1 transition"
                  id="diag-btn"
                >
                  📋 一键复制诊断报告
                </button>
              </div>
            ) : String(message)
          ),
          duration: 7000
        });
    } catch(e) {
        console.error('Error in toast notification:', e);
    }
  }
  
  // Log to Supabase for Audit
  try {
      const errorObj = error instanceof Error ? error : new Error(message);
      logErrorToSupabase(errorObj, {}, { context, silent, timestamp: new Date().toISOString() }).catch(err => {
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
