import { supabase } from '../lib/supabase';

export async function logErrorToSupabase(error: Error, errorInfo: { componentStack?: string } | null, extras: Record<string, unknown> = {}) {
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
