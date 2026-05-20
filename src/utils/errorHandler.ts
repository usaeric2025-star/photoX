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
  
  // UI Toast Notification
  if (!silent) {
    try {
        toast.dismiss();
        toast.error(`${context}: ${message}`);
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

  // Store Error for Local Audit
  try {
      useGalleryStore.getState().setErrors([{ 
        message, 
        context, 
        timestamp: Date.now() 
      }]);
  } catch(e) {
      console.error('Error in storing error log:', e);
  }
};

export const useErrorHandler = () => {
  return { handleError: globalHandleError };
};
