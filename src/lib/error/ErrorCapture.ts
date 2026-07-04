import { AppError, isAppError } from '#shared/AppError.js';
import { ErrorCode } from '#shared/errorCodes.js';
import { logger } from '#lib/logger.js';

export class ErrorCapture {
  static capture(error: Error | AppError | unknown) {
    const appError = isAppError(error) ? error : this.wrapUnknown(error);
    
    const message = appError.message || '';
    const isNoise = 
      /ResizeObserver/i.test(message) || 
      /chunk|dynamically imported|module script/i.test(message) ||
      /AbortError/i.test(message) ||
      /cancel|abort|precondition|offline|websocket|hmr/i.test(message) ||
      message.includes('DOMException') ||
      message.includes('user_cancel') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError');

    if (isNoise) return;

    if (!appError.shouldReport) {
      logger.info('[Skip Report]', appError.message);
      return;
    }

    logger.error('[AppError]', {
      message: appError.message,
      category: appError.category,
      traceId: appError.traceId,
      context: appError.context,
      userMessage: appError.userMessage,
      stack: (error as Error)?.stack
    });

    this.saveToLocal(appError);
  }

  private static wrapUnknown(error: unknown): AppError {
    // This is a minimal fallback, the main factory handles conversion
    return new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: typeof error === 'string' ? error : 'Unknown Error',
      context: { raw: error }
    });
  }

  private static saveToLocal(appError: AppError) {
    try {
      if (typeof localStorage === 'undefined') return;
      const key = 'app_errors';
      const raw = localStorage.getItem(key);
      const errors = JSON.parse(raw || '[]');
      
      const errorEntry = {
        ...appError.toJSON(),
        timestamp: appError.timestamp || new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      };

      errors.push(errorEntry);
      const limitedErrors = errors.slice(-50);
      
      try {
        localStorage.setItem(key, JSON.stringify(limitedErrors));
      } catch (storageError) {
        localStorage.removeItem(key);
        localStorage.setItem(key, JSON.stringify([errorEntry]));
      }
    } catch (e) {}
  }

  static getLocalErrors(): Record<string, unknown>[] {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch (_) {
      return [];
    }
  }

  static clearLocalErrors() {
    try {
      localStorage.removeItem('app_errors');
    } catch (_) {}
  }
}
