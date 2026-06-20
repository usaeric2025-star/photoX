import { ProblemDetails } from '@/types/problemDetails';
import * as Sentry from '@sentry/react';
import { ErrorCode } from '@/shared/errorCodes';
import { AppError, ErrorSeverity, isAppError } from './AppError';

export { ErrorCode, AppError, ErrorSeverity, isAppError };

// ===== 1. 語義化工廠方法 =====
export const ErrorFactory = {
  // 通用建構
  create: (code: ErrorCode, message: string, context?: Record<string, unknown>) =>
    new AppError({ code, message, context }),

  // 驗證錯誤 (400)
  validation: (message: string, fields?: Record<string, string>) =>
    new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message,
      severity: ErrorSeverity.WARNING,
      statusCode: 400,
      context: { fields },
    }),

  // 權限錯誤 (403)
  permission: (message: string = '访问权限不足') =>
    new AppError({
      code: ErrorCode.PERMISSION_DENIED,
      message,
      severity: ErrorSeverity.WARNING,
      statusCode: 403,
    }),

  // 資源不存在 (404)
  notFound: (resource: string, id?: string) =>
    new AppError({
      code: ErrorCode.NOT_FOUND,
      message: `找不到请求的${resource}`,
      statusCode: 404,
      context: { resource, id },
    }),

  // 衝突錯誤 (409)
  conflict: (message: string, context?: Record<string, unknown>) =>
    new AppError({
      code: ErrorCode.CONFLICT,
      message,
      statusCode: 409,
      context,
    }),

  // 網路錯誤 (502)
  network: (originalError?: Error) =>
    new AppError({
      code: ErrorCode.NETWORK_ERROR,
      message: '网络请求失败，请检查网络连接',
      severity: ErrorSeverity.WARNING,
      cause: originalError,
    }),

  // 第三方超時 (504)
  timeout: (service: string, originalError?: Error) =>
    new AppError({
      code: ErrorCode.THIRD_PARTY_TIMEOUT,
      message: `${service} 服务响应超时`,
      severity: ErrorSeverity.WARNING,
      statusCode: 504,
      context: { service },
      cause: originalError,
    }),

  // 致命錯誤 (500)
  fatal: (message: string, context?: Record<string, unknown>) =>
    new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      message,
      severity: ErrorSeverity.FATAL,
      statusCode: 500,
      context,
    }),

  // === BACKWARD COMPATIBILITY ===
  normalizeError(err: unknown): { message: string; stack?: string } {
    if (err instanceof Error) return { message: err.message, stack: err.stack };
    if (typeof err === 'string') return { message: err };
    if (typeof err === 'object' && err !== null) {
      const record = err as Record<string, unknown>;
      const rawMes = record.message || record.error || record.msg || JSON.stringify(err);
      return { message: typeof rawMes === 'object' ? JSON.stringify(rawMes).slice(0,500) : String(rawMes).slice(0,500) };
    }
    return { message: '发生未知错误' };
  },

  wrap(error: unknown, operation: string, resource?: string, severity: string = 'error'): AppError {
    const normalized = this.normalizeError(error);
    const message = `[${operation}] ${resource ? `(${resource}) ` : ''}${normalized.message}`;
    return new AppError({
      code: ErrorCode.UNKNOWN_ERROR,
      message,
      severity,
      cause: error instanceof Error ? error : undefined,
    });
  },

  handle(error: unknown, context: string = '未知操作', silent: boolean = false) {
    import('./errorHandler').then(({ handleError: realHandleError }) => {
      realHandleError(error, context, silent);
    }).catch((err) => {
      console.error('Critical failure in dynamic handleError loader:', err);
    });
  },

  toProblemDetails(error: AppError, status: number = 500): ProblemDetails {
    return {
      type: `https://api.photox.app/errors/${error.code}`,
      title: error.message,
      status: status,
      detail: error.context ? JSON.stringify(error.context) : undefined,
      instance: undefined,
      traceId: error.traceId,
      timestamp: typeof error.timestamp === 'string' ? Date.parse(error.timestamp) : error.timestamp,
    };
  }
};

export const handleError = ErrorFactory.handle;
