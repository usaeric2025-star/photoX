import { useGalleryStore } from '../store';
import { toast } from 'sonner';
import { logErrorToSupabase } from '../services/logService';
import * as Sentry from '@sentry/react';

export const globalHandleError = (error: any, context: string, silent: boolean = false) => {
  console.error(`[Error] ${context}:`, error);
  
  // Capture in GlitchTip/Sentry
  Sentry.captureException(error);

  // UI Toast Notification
  let message = '';
  if (typeof error === 'string') {
      message = error;
  } else if (error instanceof Error) {
      message = error.message;
  } else if (error && typeof error === 'object' && error.message) {
      message = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
  } else {
      message = JSON.stringify(error);
  }
  
  if (!silent) {
    toast.dismiss();
    toast.error(`${context}: ${message}`);
  }
  
  // Log to Supabase for Audit
  const errorObj = error instanceof Error ? error : new Error(message);
  logErrorToSupabase(errorObj, {}, { context, silent, timestamp: new Date().toISOString() }).catch(err => {
    console.error('Failed to log error to Supabase:', err);
  });

  // Store Error for Local Audit
  useGalleryStore.getState().setErrors([{ 
    message, 
    context, 
    timestamp: Date.now() 
  }]);
};

export const useErrorHandler = () => {
  return { handleError: globalHandleError };
};
