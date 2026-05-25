import { reportError } from '@/lib/errorReporter';
import { supabase } from '@/lib/supabase';

// Helper to get app mode
const getCurrentVariant = () => typeof window !== 'undefined' ? (window as any).__PHOTOX_MODE__ || 'public' : 'public';

const handledErrors = new WeakSet<Error>();

export function markErrorAsHandled(error: unknown): void {
  if (error instanceof Error) handledErrors.add(error);
}

export function isErrorHandled(error: unknown): boolean {
  return error instanceof Error && handledErrors.has(error);
}

export type LogLevel = 'error' | 'success';

interface EventContext {
  action: string;
  component: string;
  metadata?: any;
}

export const logError = async (error: Error | unknown, context: EventContext) => {
  const mode = getCurrentVariant();
  
  // Always log to reporter
  reportError(error as Error, context.action);
  
  // Log detailed audit if staff
  if (mode === 'staff') {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await supabase.from('system_logs').insert([{
      type: 'error',
      action: context.action,
      component: context.component,
      message: errorMsg,
      stack_trace: error instanceof Error ? error.stack : null,
      metadata: { ...context.metadata, timestamp: new Date().toISOString() }
    }]);
  }
};

export const logResult = async (context: EventContext, type: LogLevel, data?: any) => {
  // Always log success/failure to audit trail if staff
  if (getCurrentVariant() === 'staff') {
    await supabase.from('system_logs').insert([{
      type,
      action: context.action,
      component: context.component,
      metadata: { ...context.metadata, data, timestamp: new Date().toISOString() }
    }]);
  }
  
  // Public mode logs are handled via background beacon or queue, 
  // implemented here as a minimal footprint async insert if needed.
};
