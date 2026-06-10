import { supabase } from '@/lib/supabase';
import { handleError } from '@/lib/error/errorHandler';
import { clientEnv } from '@/shared/envSchema';

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
  const stackTrace = error instanceof Error ? error.stack : undefined;
  
  // 1. App Console dev logs
  if (clientEnv.DEV) {
    console.group(`%c🔴 [ERROR] ${context.action}`, `color: #ef4444; font-weight: bold;`);
    console.error(error);
    console.groupEnd();
  }

  // 2. Global UI Error Handler (Toast, etc)
  const enrichedError = error instanceof Error ? error : new Error(errorMsg);
  handleError(enrichedError, context.action, false);

  // 3. Always report to backend for persistence (system_logs)
  // [2026-06-03] Frontend logs to /api/log-error are disabled to prevent performance/noise issues
  /*
  try {
    await fetch('/api/log-error', { ... });
  } catch (e) {
    console.error('[ErrorLogger] Failed to send log to API:', e);
  }
  */
};

export const logResult = async (context: EventContext, type: LogLevel, data?: any) => {
    // [2026-06-03] Frontend logs to /api/log-error are disabled to prevent performance/noise issues
    /*
    try {
      await fetch('/api/log-error', { ... });
    } catch (e) {
      console.error('[ErrorLogger] Failed to send log result to API:', e);
    }
    */
};
