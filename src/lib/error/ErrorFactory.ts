import { AppResult, AppError, AppSuccess, ErrorCode } from '@/types/api';
import { handleError as baseHandleError } from './errorHandler';
import { ProblemDetails } from '@/types/problemDetails';
import * as Sentry from '@sentry/react';
import { logError, ERROR_KINDS } from '@/services/system/logService';

// Initialize Sentry/GlitchTip
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export type { AppResult, AppError, AppSuccess, ErrorCode };

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export class ErrorFactory {
  static normalizeError(err: unknown): { message: string; stack?: string } {
    if (err instanceof Error) {
      return { message: err.message, stack: err.stack };
    }
    if (typeof err === 'string') {
      return { message: err };
    }
    if (typeof err === 'object' && err !== null) {
      const anyErr = err as any;
      const rawMessage = anyErr.message || anyErr.error || anyErr.msg || JSON.stringify(err);
      const message = typeof rawMessage === 'object' ? JSON.stringify(rawMessage) : String(rawMessage);
      return { message: message.slice(0, 500) };
    }
    return { message: 'Unknown error' };
  }

  static wrap(error: unknown, operation: string, resource?: string, severity: ErrorSeverity = 'high') {
    const normalized = this.normalizeError(error);
    const wrapped = new Error(`[${operation}] ${resource ? `(${resource}) ` : ''}${normalized.message}`);
    (wrapped as any).originalError = error;
    (wrapped as any).operation = operation;
    (wrapped as any).resource = resource;
    (wrapped as any).severity = severity;
    if (typeof error === 'object' && error !== null && 'traceId' in error) {
      (wrapped as any).traceId = (error as any).traceId;
    }
    return wrapped;
  }

  static createError(
    message: string,
    code: ErrorCode = 'UNKNOWN',
    context?: string,
    cause?: unknown
  ): AppError {
    let traceId: string | undefined;
    if (typeof cause === 'object' && cause !== null && 'traceId' in cause) {
      traceId = (cause as any).traceId;
    }
    return {
      ok: false,
      error: true,
      message,
      code,
      context,
      timestamp: Date.now(),
      traceId,
      cause,
    };
  }

  static success<T>(data: T): AppSuccess<T> {
    return { ok: true, data };
  }

  static handle(error: unknown, context: string = '未知操作', silent: boolean = false) {
    baseHandleError(error, context, silent);
    Sentry.captureException(error, {
      extra: { context },
    });
    
    // Unified logging
    logError(error, {
      action: context,
      component: 'App', // Or try to infer from context
      kind: ERROR_KINDS.UNKNOWN,
    });
  }

  static toProblemDetails(error: AppError, status: number = 500): ProblemDetails {
    return {
      type: `https://api.photox.app/errors/${error.code}`,
      title: error.message,
      status: status,
      detail: error.context,
      instance: undefined, // Could map to specific internal path if needed
      traceId: error.traceId,
      timestamp: error.timestamp,
    };
  }
}

export const errorFactory = ErrorFactory.createError;
export const success = ErrorFactory.success;
export const ok = success;
export const err = errorFactory;
export const fail = err;
export const handleError = ErrorFactory.handle;

export function isErr<T>(result: AppResult<T>): result is AppError {
  return !result.ok;
}

export function isOk<T>(result: AppResult<T>): result is AppSuccess<T> {
  return result.ok;
}

export function fromThrowable<T>(fn: () => T, context?: string): AppResult<T> {
  try {
    return success(fn());
  } catch (err) {
    const error = ErrorFactory.normalizeError(err);
    return ErrorFactory.createError(error.message, 'UNKNOWN', context, err);
  }
}

export async function fromThrowableAsync<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<AppResult<T>> {
  try {
    return success(await fn());
  } catch (err) {
    const error = ErrorFactory.normalizeError(err);
    return ErrorFactory.createError(error.message, 'UNKNOWN', context, err);
  }
}
