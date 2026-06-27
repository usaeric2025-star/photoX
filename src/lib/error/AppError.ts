import { ErrorCode } from '@/shared/errorCodes';

// ===== 1. 错误严重等级 =====
export enum ErrorSeverity {
  INFO = 'info',       // 仅记录，不告警
  WARNING = 'warning', // 记录 + 标记
  ERROR = 'error',     // 记录 + 即时告警
  FATAL = 'fatal',     // 记录 + 紧急呼叫
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  RUNTIME = 'runtime',
  BUSINESS = 'business',
}

// ===== 2. 辅助函数 =====
export function mapCodeToStatus(code: ErrorCode | string): number {
  const map: Record<string, number> = {
    [ErrorCode.VALIDATION_FAILED]: 400,
    [ErrorCode.PERMISSION_DENIED]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.NETWORK_ERROR]: 502,
    [ErrorCode.THIRD_PARTY_TIMEOUT]: 504,
    [ErrorCode.UNKNOWN_ERROR]: 500,
  };
  return map[code] ?? 500;
}

// ===== 3. 标准化 AppError 类别 =====
export class AppError extends Error {
  public readonly code: ErrorCode | string;
  public readonly severity: ErrorSeverity | string;
  public readonly statusCode: number;
  public readonly traceId: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;
  public override readonly cause?: Error;
  public readonly category: string;
  public readonly userMessage: string;
  public readonly shouldReport: boolean;

  constructor(params: {
    code: ErrorCode | string;
    message: string;
    severity?: ErrorSeverity | string;
    statusCode?: number;
    context?: Record<string, unknown>;
    cause?: Error;
    category?: string;
    userMessage?: string;
    shouldReport?: boolean;
    traceId?: string;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'AppError';
    this.code = params.code;
    this.severity = params.severity ?? ErrorSeverity.ERROR;
    this.statusCode = params.statusCode ?? mapCodeToStatus(params.code);
    this.traceId = params.traceId ?? crypto.randomUUID();
    this.timestamp = new Date().toISOString();
    this.context = params.context;
    this.cause = params.cause;
    this.category = params.category ?? 'runtime';
    this.userMessage = params.userMessage ?? params.message;
    this.shouldReport = params.shouldReport ?? true;
  }

  // 安全序列化（避免循环引用）
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
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
