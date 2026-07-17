import { AppError, isAppError } from '#shared/AppError.js';
import { ErrorCode } from '#shared/errorCodes.js';
import { logger } from '#lib/logger.js';
import { rawApi } from '#lib/api-raw.js';

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

    // Send error diagnostics asynchronously to the backend system_logs database
    if (typeof window !== 'undefined') {
      const isRealPage404 = appError.message.startsWith('404: ');
      const is404 = isRealPage404 || 
                    appError.message.toLowerCase().includes('404') || 
                    appError.code === ErrorCode.NOT_FOUND || 
                    appError.statusCode === 404;
      
      let logMessage = `[Client Error] ${appError.message}`;
      let logOperation = 'client.error';

      if (isRealPage404) {
        const realPath = appError.message.replace(/^404:\s*/, '');
        logMessage = `[Page 404] Not Found: ${realPath}`;
        logOperation = 'page.404';
      } else if (is404) {
        logMessage = `[API 404] Resource Not Found: ${appError.message}`;
        logOperation = 'api.404';
      }

      const payload = {
        message: logMessage,
        level: 'error' as const,
        operation: logOperation,
        metadata: {
          traceId: appError.traceId,
          category: appError.category,
          context: appError.context,
          userMessage: appError.userMessage,
          stack: (error as Error)?.stack || new Error().stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }
      };

      rawApi.api.system['log-error'].$post({ json: payload }).catch(e => {
        // Silent catch to prevent infinite error logging loops
        logger.warn('Failed to report error to server:', e);
      });
    }
  }

  private static wrapUnknown(error: unknown): AppError {
    if (isAppError(error)) return error;

    let message = 'Unknown Error';
    let cause: Error | undefined = undefined;

    if (error instanceof Error) {
      message = error.message;
      cause = error;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
      message = (error as any).message;
    } else if (typeof error === 'string') {
      message = error;
    }

    return new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      message,
      cause,
      context: { raw: error }
    });
  }

  private static lastErrorFingerprint: string | null = null;
  private static lastErrorTime: number = 0;

  private static saveToLocal(appError: AppError) {
    try {
      if (typeof localStorage === 'undefined') return;

      // Deduplication: skip if same error message within 5 seconds
      const fingerprint = `${appError.code}_${appError.message}`;
      const now = Date.now();
      if (this.lastErrorFingerprint === fingerprint && (now - this.lastErrorTime) < 5000) {
        return;
      }
      this.lastErrorFingerprint = fingerprint;
      this.lastErrorTime = now;

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
        // Handle quota exceeded
        localStorage.removeItem(key);
        localStorage.setItem(key, JSON.stringify([errorEntry]));
      }
    } catch (e) {
      // Silently fail if localStorage is disabled
    }
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
