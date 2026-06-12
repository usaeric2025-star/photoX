import { handleError } from '@/lib/error/errorHandler';

export const ERROR_KINDS = {
  AUTH: 'AUTH',
  NETWORK: 'NETWORK',
  STORAGE: 'STORAGE',
  VALIDATION: 'VALIDATION',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorKind = keyof typeof ERROR_KINDS;
export type LogLevel = 'error' | 'success';

export interface EventContext {
  action: string;
  component: string;
  kind: ErrorKind;
  metadata?: any;
}

/**
 * Core logging service that reports to the backend /api/log-error endpoint.
 */
export const logError = async (error: Error | unknown, context: EventContext) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;
  
  // 1. Console dev logs
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.group(`%c🔴 [ERROR] ${context.action}`, `color: #ef4444; font-weight: bold;`);
    console.error(error);
    console.groupEnd();
  }

  // 2. Global UI Error Handler (Toast, etc)
  const enrichedError = error instanceof Error ? error : new Error(errorMsg);
  handleError(enrichedError, context.action, false);

  // 3. Always report to backend for persistence (system_logs)
  try {
    const traceId = (error as any)?.traceId || 'fe-' + Math.random().toString(36).substring(2, 12);
    
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId
      },
      body: JSON.stringify({
        error_message: errorMsg,
        stack_trace: stackTrace || (error as any)?.details || null,
        url: typeof window !== 'undefined' ? window.location.href : '',
        context: context.component || 'global',
        metadata: {
          ...context.metadata,
          action: context.action,
          kind: context.kind,
          traceId,
          timestamp: new Date().toISOString()
        }
      })
    });
  } catch (e) {
    console.error('[logService] Failed to send log to API:', e);
  }
};

export const logResult = async (context: EventContext, type: LogLevel, data?: any) => {
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error_message: `[${type.toUpperCase()}] ${context.action}`,
        url: typeof window !== 'undefined' ? window.location.href : '',
        context: context.component || 'global',
        metadata: {
          ...context.metadata,
          action: context.action,
          kind: context.kind,
          level: type,
          data,
          timestamp: new Date().toISOString()
        }
      })
    });
  } catch (e) {
    console.error('[logService] Failed to send log result to API:', e);
  }
};
