import { reportError } from '@/lib/errorReporter';
import { supabase } from '@/lib/supabase';

export const ERROR_KINDS = {
  AUTH: 'AUTH',
  NETWORK: 'NETWORK',
  STORAGE: 'STORAGE',
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorKind = keyof typeof ERROR_KINDS;

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
  kind: ErrorKind;
  metadata?: any;
}

export const logError = async (error: Error | unknown, context: EventContext) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : null;
  
  // Structured JSON output
  const logEntry = {
    level: 'error',
    kind: context.kind,
    action: context.action,
    component: context.component,
    message: errorMsg,
    stack: stackTrace,
    metadata: { ...context.metadata, timestamp: new Date().toISOString() }
  };

  console.error('[DiagnosticLog]', JSON.stringify(logEntry));
  
  // Always log to reporter
  reportError(error as Error, context.action);
  
  // Log to system_logs for audit
  await supabase.from('system_logs').insert([logEntry]);
};

export const logResult = async (context: EventContext, type: LogLevel, data?: any) => {
    const logEntry = {
      level: type,
      action: context.action,
      component: context.component,
      metadata: { ...context.metadata, data, timestamp: new Date().toISOString() }
    };
  
    await supabase.from('system_logs').insert([logEntry]);
};
