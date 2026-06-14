import { AppResult, AppSuccess, OldAppError as LegacyAppError } from '@/types/api';
import { ProblemDetails } from '@/types/problemDetails';
import { handleError as legacyHandleError } from './errorHandler';
import * as Sentry from '@sentry/react';

// ===== 1. 錯誤碼枚舉 =====
export enum ErrorCode {
  // 業務驗證類
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // 資料與狀態類
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // 外部服務類
  NETWORK_ERROR = 'NETWORK_ERROR',
  THIRD_PARTY_TIMEOUT = 'THIRD_PARTY_TIMEOUT',
  
  // 系統未知類
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ===== 2. 錯誤嚴重等級 =====
export enum ErrorSeverity {
  INFO = 'info',       // 僅記錄，不告警
  WARNING = 'warning', // 記錄 + 標記
  ERROR = 'error',     // 記錄 + 即時告警
  FATAL = 'fatal',     // 記錄 + 緊急呼叫
}

// ===== 3. 標準化 AppError 類別 =====
export class AppError extends Error {
  public readonly code: ErrorCode | string
  public readonly severity: ErrorSeverity | string
  public readonly statusCode: number
  public readonly traceId: string
  public readonly timestamp: string
  public readonly context?: Record<string, unknown>
  public override readonly cause?: Error

  constructor(params: {
    code: ErrorCode | string
    message: string
    severity?: ErrorSeverity | string
    statusCode?: number
    context?: Record<string, unknown>
    cause?: Error
  }) {
    super(params.message, { cause: params.cause })
    this.name = 'AppError'
    this.code = params.code
    this.severity = params.severity ?? ErrorSeverity.ERROR
    this.statusCode = params.statusCode ?? mapCodeToStatus(params.code as ErrorCode)
    this.traceId = crypto.randomUUID()
    this.timestamp = new Date().toISOString()
    this.context = params.context
    this.cause = params.cause
  }

  // ✅ 安全序列化（避免循環引用）
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      statusCode: this.statusCode,
      traceId: this.traceId,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      cause: this.cause instanceof AppError ? this.cause.toJSON() : this.cause?.message,
    }
  }
}

// ===== 4. 語義化工廠方法 =====
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
  permission: (message: string = '權限不足') =>
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
      message: `${resource} not found`,
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
      message: 'Network request failed',
      severity: ErrorSeverity.WARNING,
      cause: originalError,
    }),

  // 第三方超時 (504)
  timeout: (service: string, originalError?: Error) =>
    new AppError({
      code: ErrorCode.THIRD_PARTY_TIMEOUT,
      message: `${service} timeout`,
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
      const anyErr = err as any;
      const rawMes = anyErr.message || anyErr.error || anyErr.msg || JSON.stringify(err);
      return { message: typeof rawMes === 'object' ? JSON.stringify(rawMes).slice(0,500) : String(rawMes).slice(0,500) };
    }
    return { message: 'Unknown error' };
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

  createError(message: string, code: string = 'UNKNOWN', context?: string, cause?: unknown): LegacyAppError {
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
  },

  success<T>(data: T): AppSuccess<T> {
    return { ok: true, data };
  },

  handle(error: unknown, context: string = '未知操作', silent: boolean = false) {
    legacyHandleError(error, context, silent);
  },

  toProblemDetails(error: LegacyAppError | AppError, status: number = 500): ProblemDetails {
    return {
      type: `https://api.photox.app/errors/${error.code}`,
      title: error.message,
      status: status,
      detail: (error as any).context,
      instance: undefined,
      traceId: error.traceId,
      timestamp: typeof error.timestamp === 'string' ? Date.parse(error.timestamp) : error.timestamp,
    };
  }
};

// ===== 5. 輔助函數 =====
function mapCodeToStatus(code: ErrorCode): number {
  const map: Record<string, number> = {
    [ErrorCode.VALIDATION_FAILED]: 400,
    [ErrorCode.PERMISSION_DENIED]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.NETWORK_ERROR]: 502,
    [ErrorCode.THIRD_PARTY_TIMEOUT]: 504,
    [ErrorCode.UNKNOWN_ERROR]: 500,
  }
  return map[code] ?? 500
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

// === BACKWARD COMPATIBILITY EXPORTS ===
export const errorFactory = ErrorFactory.createError;
export const success = ErrorFactory.success;
export const ok = success;
export const err = errorFactory;
export const fail = err;
export const handleError = ErrorFactory.handle;

export function isErr<T>(result: AppResult<T>): result is LegacyAppError {
  return !result.ok;
}

export function isOk<T>(result: AppResult<T>): result is AppSuccess<T> {
  return result.ok;
}

export function fromThrowable<T>(fn: () => T, context?: string): AppResult<T> {
  try {
    return success(fn());
  } catch (error) {
    const norm = ErrorFactory.normalizeError(error);
    return ErrorFactory.createError(norm.message, 'UNKNOWN', context, error);
  }
}

export async function fromThrowableAsync<T>(fn: () => Promise<T>, context?: string): Promise<AppResult<T>> {
  try {
    return success(await fn());
  } catch (error) {
    const norm = ErrorFactory.normalizeError(error);
    return ErrorFactory.createError(norm.message, 'UNKNOWN', context, error);
  }
}

export type { AppResult, AppSuccess };
