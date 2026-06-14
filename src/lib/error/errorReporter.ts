import { AppError, ErrorSeverity, isAppError, ErrorFactory } from './ErrorFactory'

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

export async function reportError(error: Error | AppError): Promise<void> {
  if (reportedErrors.has(error)) return
  reportedErrors.add(error)

  const isAppErrorObj = isAppError(error)

  if (isAppErrorObj && error.severity === ErrorSeverity.INFO) {
    console.debug('[ErrorReporter] INFO level, skip remote report')
    return
  }

  // 1. GlitchTip / Sentry
  if (typeof window !== 'undefined' && 'Sentry' in window) {
    // Sentry capture exception is handled elsewhere or can be used here
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
        body: JSON.stringify(payload),
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
  metadata?: any;
}

export const logError = async (error: Error | unknown, context: EventContext) => {
  const normError = isAppError(error) ? error : (error instanceof Error ? error : new Error(String(error)));
  
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.group(`%c🔴 [ERROR] ${context.action}`, `color: #ef4444; font-weight: bold;`);
    console.error(normError);
    console.groupEnd();
  }
  
  try {
    const traceId = (normError as any)?.traceId || 'fe-' + Math.random().toString(36).substring(2, 12);
    
    await fetch('/api/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId
      },
      body: JSON.stringify({
        error_message: normError.message,
        stack_trace: normError.stack || (normError as any)?.details || null,
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

export const logResult = async (context: EventContext, type: 'error' | 'success', data?: any) => {
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
