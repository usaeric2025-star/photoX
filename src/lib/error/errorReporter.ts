import { AppError, ErrorSeverity, isAppError, ErrorFactory } from './ErrorFactory'
import * as Sentry from '@sentry/react'
import { clientEnv } from '@/shared/envSchema'

// WeakSet for tracking reported errors to avoid duplicates
const reportedErrors = new WeakSet<Error>()

function shouldLogToBackend(error: Error): boolean {
  return !error.message.includes('AbortError')
}

function handleReportFailure(error: unknown): void {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    console.debug('[ErrorReporter] 日誌上報網路失敗，已忽略')
    return
  }
  console.error('[ErrorReporter] 日誌上報 API 失敗:', error)
}

function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    // If circular reference or other error, try a simpler approach or return fallback
    console.warn('[ErrorReporter] 序列化日誌數據失敗，正在使用降級方案:', e);
    
    // Simple depth-limited or circular-safe stringifier (basic version)
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);
      }
      return value;
    });
  }
}

export async function reportError(error: Error | AppError): Promise<void> {
  if (reportedErrors.has(error)) return
  reportedErrors.add(error)

  const isAppErrorObj = isAppError(error)

  if (isAppErrorObj && error.severity === ErrorSeverity.INFO) {
    console.debug('[ErrorReporter] INFO level, skip remote report')
    return
  }

  // 1. GlitchTip / Sentry
  if (clientEnv.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        app: 'photox',
        type: isAppErrorObj ? 'AppError' : 'Error',
        severity: isAppErrorObj ? String(error.severity) : 'error',
      },
      extra: isAppErrorObj ? error.toJSON() : undefined,
    });
  }

  // 2. Backend logging via system_logs
  if (isAppErrorObj || shouldLogToBackend(error)) {
    const payload = isAppErrorObj
      ? error.toJSON()
      : {
          name: error.name,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        }

    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(payload),
      })
    } catch (err) {
      handleReportFailure(err)
    }
  }
}

export async function reportErrors(errors: Error[]): Promise<void> {
  await Promise.all(errors.map(reportError))
}

export interface EventContext {
  action: string;
  component: string;
  kind?: string;
  metadata?: Record<string, unknown>;
}

export const logError = async (error: Error | unknown, context: EventContext) => {
  const normError = isAppError(error) ? error : (error instanceof Error ? error : new Error(String(error)));
  
  // Send to Sentry
  if (clientEnv.VITE_SENTRY_DSN) {
    Sentry.captureException(normError, {
      tags: {
        action: context.action,
        component: context.component,
        kind: context.kind || 'UNKNOWN',
      },
      extra: {
        metadata: context.metadata,
      }
    });
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.group(`%c🔴 [ERROR] ${context.action}`, `color: #ef4444; font-weight: bold;`);
    console.error(normError);
    console.groupEnd();
  }
  
  try {
    const errorWithMeta = normError as unknown as Record<string, unknown>;
    const traceId = (errorWithMeta.traceId as string) || 'fe-' + Math.random().toString(36).substring(2, 12);
    
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId
      },
      body: safeJsonStringify({
        error_message: normError.message,
        stack_trace: normError.stack || (errorWithMeta.details as string) || null,
        url: typeof window !== 'undefined' ? window.location.href : '',
        context: context.component || 'global',
        metadata: {
          ...context.metadata,
          action: context.action,
          kind: context.kind || 'UNKNOWN',
          traceId,
          timestamp: new Date().toISOString()
        }
      })
    });
  } catch (e) {
    console.error('[logService] Failed to send log to API:', e);
  }
}

export const logResult = async (context: EventContext, type: 'error' | 'success', data?: unknown) => {
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: safeJsonStringify({
        error_message: `[${type.toUpperCase()}] ${context.action}`,
        url: typeof window !== 'undefined' ? window.location.href : '',
        context: context.component || 'global',
        metadata: {
          ...context.metadata,
          action: context.action,
          kind: context.kind || 'UNKNOWN',
          level: type,
          data,
          timestamp: new Date().toISOString()
        }
      })
    });
  } catch (e) {
    console.error('[logService] Failed to send log result to API:', e);
  }
}
