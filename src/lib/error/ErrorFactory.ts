import * as v from 'valibot';
import { ErrorCode } from '#shared/errorCodes.js';
import { AppError, ErrorSeverity, isAppError, ErrorCategory } from '#shared/AppError.js';
import { showToast } from '#lib/ui/toast.js';
import { logger } from '#lib/logger.js';
import { generateTraceId } from '#lib/utils.js';
import { ErrorFormatter } from './ErrorFormatter.js';
import { ErrorCapture } from './ErrorCapture.js';

export class ErrorFactory {
  private static get t() {
    return ErrorFormatter.t;
  }

  static create(
    message: string,
    options: {
      category?: ErrorCategory;
      userMessage?: string;
      traceId?: string;
      context?: Record<string, unknown>;
      shouldReport?: boolean;
      originalError?: unknown;
      code?: ErrorCode;
      severity?: ErrorSeverity;
      statusCode?: number;
    } = {}
  ): AppError {
    return new AppError({
      code: options.code ?? ErrorCode.UNKNOWN_ERROR,
      message,
      severity: options.severity ?? ErrorSeverity.ERROR,
      statusCode: options.statusCode ?? 500,
      context: { 
        ...options.context, 
        original: options.originalError 
      },
      cause: options.originalError instanceof Error ? options.originalError : undefined,
      category: options.category ?? ErrorCategory.RUNTIME,
      userMessage: options.userMessage ?? message,
      shouldReport: options.shouldReport ?? 
        (options.category !== ErrorCategory.BUSINESS && options.category !== ErrorCategory.VALIDATION),
      traceId: options.traceId,
    });
  }

  static fromApiResponse(data: { code: string; message: string; traceId?: string }): AppError {
    const categoryMap: Record<string, ErrorCategory> = {
      UNAUTHORIZED: ErrorCategory.AUTH,
      FORBIDDEN: ErrorCategory.AUTH,
      VALIDATION_ERROR: ErrorCategory.VALIDATION,
      NETWORK_ERROR: ErrorCategory.NETWORK,
    };
    const category = categoryMap[data.code] ?? ErrorCategory.BUSINESS;
    return this.create(data.message, {
      category,
      userMessage: data.message,
      traceId: data.traceId,
      shouldReport: ![ErrorCategory.VALIDATION, ErrorCategory.BUSINESS].includes(category),
    });
  }

  static network(originalError?: unknown): AppError {
    return this.create('Network Error', {
      category: ErrorCategory.NETWORK,
      userMessage: this.t.imageLoadFailed,
      originalError,
      code: ErrorCode.NETWORK_ERROR,
      statusCode: 503
    });
  }

  static auth(message: string): AppError {
    return this.create(message, {
      category: ErrorCategory.AUTH,
      userMessage: this.t.loginFailed,
      code: ErrorCode.UNAUTHORIZED,
      statusCode: 401
    });
  }

  static validation(message: string, context?: Record<string, unknown>): AppError {
    return this.create(message, {
      category: ErrorCategory.VALIDATION,
      userMessage: this.t.invalidDataFormat || '输入数据格式不正确',
      context: { fields: context },
      shouldReport: false,
      code: ErrorCode.VALIDATION_FAILED,
      severity: ErrorSeverity.WARNING,
      statusCode: 400
    });
  }

  static business(message: string): AppError {
    return this.create(message, {
      category: ErrorCategory.BUSINESS,
      userMessage: message,
      shouldReport: false,
    });
  }

  static fatal(message: string, originalError?: unknown): AppError {
    return this.create(message, {
      category: ErrorCategory.RUNTIME,
      userMessage: this.t.mutationRollbackFailed,
      originalError,
      shouldReport: true,
      code: ErrorCode.INTERNAL_ERROR,
      severity: ErrorSeverity.FATAL,
      statusCode: 500
    });
  }

  static notFound(resource: string, id: string): AppError {
    const resourceLocalized = ErrorFormatter.mapResourceToLocalized(resource);
    return this.create(`${resource} not found`, {
        category: ErrorCategory.BUSINESS,
        userMessage: this.t.loadFailed(resourceLocalized),
        context: { resource, id },
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
        severity: ErrorSeverity.WARNING
    });
  }

  static wrap(error: unknown, operation: string, resource?: string): AppError {
    const opLocalized = operation;
    const resLocalized = resource ? ErrorFormatter.mapResourceToLocalized(resource) : '';
    const cleanUserMsg = resource ? `${opLocalized}${resLocalized}${this.t.saveFailed}` : `${opLocalized}${this.t.saveFailed}`;
    const systemMsg = error instanceof Error ? error.message : this.extractErrorMessage(error);
    return this.create(systemMsg, {
      category: ErrorCategory.RUNTIME,
      userMessage: cleanUserMsg,
      originalError: error,
      context: { operation, resource },
      shouldReport: true,
      code: ErrorCode.UNKNOWN_ERROR,
      statusCode: 500
    });
  }
  
  static permission(message: string): AppError {
    return this.create(message, {
      category: ErrorCategory.AUTH,
      userMessage: this.t.permissionDenied || '权限不足，拒绝访问',
      shouldReport: false,
      code: ErrorCode.PERMISSION_DENIED,
      statusCode: 403,
      severity: ErrorSeverity.WARNING
    });
  }

  static capture(error: Error | AppError | unknown) {
    ErrorCapture.capture(error);
  }

  static getLocalErrors(): Record<string, unknown>[] {
    return ErrorCapture.getLocalErrors();
  }

  static clearLocalErrors() {
    ErrorCapture.clearLocalErrors();
  }

  static fromUnknown(error: unknown, context?: Record<string, unknown>): AppError {
    if (isAppError(error)) return error;
    
    if (error instanceof v.ValiError) {
      const msg = ErrorFormatter.formatValibotError(error);
      return this.create(msg, {
        category: ErrorCategory.VALIDATION,
        userMessage: msg,
        context: { ...context, original: error },
        code: ErrorCode.VALIDATION_FAILED,
        severity: ErrorSeverity.WARNING,
        statusCode: 400,
        traceId: generateTraceId(),
      });
    }

    if (error instanceof Error) {
      return this.create(error.message, { originalError: error });
    }
    
    const systemMsg = typeof error === 'string' ? error : this.extractErrorMessage(error);
    return this.create(systemMsg, { 
      context: { raw: error } 
    });
  }
  
  static handle(error: unknown, options?: { context?: string; silent?: boolean }): void {
    const context = options?.context || 'unknown-context';
    const silent = options?.silent ?? false;
    this.handleError(error, context, silent);
  }

  static handleError(error: unknown, context: string, silent: boolean = false): void {
    if (silent) return;
    this.capture(error);
    
    const appError = isAppError(error)
      ? error
      : this.wrap(error, context);
    
    if (typeof window !== 'undefined') {
      showToast.error(appError);
    }
  }
  
  static extractErrorMessage(error: unknown): string {
    return ErrorFormatter.extractErrorMessage(error);
  }

  static setUser(user: unknown) {
    logger.debug('[ErrorFactory] setUser:', user);
  }

  static addBreadcrumb(breadcrumb: unknown) {
    logger.debug('[ErrorFactory] addBreadcrumb:', breadcrumb);
  }
}
