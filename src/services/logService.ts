import { supabase } from '../lib/supabase';

export async function logErrorToSupabase(error: Error, errorInfo: any, extras: any = {}) {
  try {
    const { error: logError } = await supabase
      .from('system_logs')
      .insert([
        {
          error_message: error?.message || 'Unknown error',
          stack_trace: error?.stack || null,
          component_stack: errorInfo?.componentStack || null,
          url: window.location.href,
          metadata: {
            ...extras,
            userAgent: navigator.userAgent
          }
        }
      ]);
      
    if (logError) {
      console.error("Failed to log error to Supabase:", logError);
    }
  } catch (e) {
    console.error("Critical failure during error logging:", e);
  }
}
