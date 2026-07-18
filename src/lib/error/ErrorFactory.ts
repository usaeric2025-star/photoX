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

  static fromApiResponse(
    data: any,
    fallbackMessage?: string
  ): AppError {
    if (!data) {
      return this.create(fallbackMessage || 'API Error');
    }

    // Extract inner error payload or use flat structure
    const err = data.error ?? data;
    
    if (typeof err === 'string') {
      return this.create(err, { 
        userMessage: err,
        code: data.code || ErrorCode.UNKNOWN_ERROR,
        traceId: data.traceId
      });
    }

    let message = err.message || data.message || fallbackMessage || 'API Error';
    if (typeof message === "string" && (message.includes("Invalid type:") || message.includes("Invalid key:") || message.includes("Expected ") || message.includes("Validation "))) { 
      message = `輸入數據格式不正確 (Validation Error): ${message}`; 
    }
    const code = err.code || data.code || ErrorCode.UNKNOWN_ERROR;
    const traceId = err.traceId || data.traceId || generateTraceId();

    const categoryMap: Record<string, ErrorCategory> = {
      UNAUTHORIZED: ErrorCategory.AUTH,
      FORBIDDEN: ErrorCategory.AUTH,
      VALIDATION_ERROR: ErrorCategory.VALIDATION,
      NETWORK_ERROR: ErrorCategory.NETWORK,
    };

    const codeStr = String(code);
    const category = categoryMap[codeStr] ?? ErrorCategory.BUSINESS;

    return this.create(message, {
      category,
      userMessage: message,
      traceId,
      code: code as ErrorCode,
      shouldReport: ![ErrorCategory.VALIDATION, ErrorCategory.BUSINESS].includes(category),
    });
  }

  /**
   * Unwraps any Promise, Fetch Response, or API contract response object into standard data T,
   * automatically handling non-ok HTTP statuses, un-parseable JSON, error objects, and trace IDs.
   * Promotes extremely clean, reusable 1-line query and mutation hooks.
   */
  static async unwrap<T>(
    promiseOrResponse: Promise<any> | any,
    fallbackMessage: string
  ): Promise<T> {
    try {
      const res = await promiseOrResponse;
      
      // Handle standard browser/node fetch Response object
      if (res && typeof res === 'object' && 'json' in res && typeof res.json === 'function') {
        if (!res.ok) {
          let errorData: any = null;
          try {
            errorData = await res.json();
          } catch {
            throw this.create(`${res.status} ${res.statusText || 'HTTP Error'}`, {
              code: ErrorCode.NETWORK_ERROR,
              statusCode: res.status,
              userMessage: fallbackMessage,
            });
          }
          throw this.fromApiResponse(errorData, fallbackMessage);
        }
        
        const json = await res.json();
        if (json && typeof json === 'object') {
          if (json.success === false) {
            throw this.fromApiResponse(json, fallbackMessage);
          }
          if ('data' in json) {
            return json.data as T;
          }
          return json as T;
        }
        return json as T;
      }

      // Handle standard parsed API JSON response object
      if (res && typeof res === 'object') {
        if (res.success === false) {
          throw this.fromApiResponse(res, fallbackMessage);
        }
        if ('data' in res) {
          return res.data as T;
        }
      }

      return res as T;
    } catch (err) {
      if (isAppError(err)) {
        throw err;
      }
      throw this.fromUnknown(err, { fallbackMessage });
    }
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
      code: ErrorCode.UNKNOWN_ERROR,
      statusCode: 400
    });
  }

  static fatal(message: string, originalError?: unknown): AppError {
    return this.create(message, {
      category: ErrorCategory.RUNTIME,
      userMessage: this.t.mutationRollbackFailed,
      shouldReport: true,
      originalError,
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
      userMessage: cleanUserMsg,
      originalError: error,
      context: { operation, resource },
      code: ErrorCode.UNKNOWN_ERROR,
    });
  }
  
  static permission(message: string): AppError {
    return this.create(message, {
      category: ErrorCategory.AUTH,
      userMessage: this.t.permissionDenied || '权限不足，拒绝访问',
      code: ErrorCode.PERMISSION_DENIED,
      statusCode: 403,
      severity: ErrorSeverity.WARNING
    });
  }

  static capture(error: Error | AppError | unknown) {
    const appError = isAppError(error) ? error : this.fromUnknown(error);
    ErrorCapture.capture(appError);
  }

  static getLocalErrors(): Record<string, unknown>[] {
    return ErrorCapture.getLocalErrors();
  }

  static clearLocalErrors() {
    ErrorCapture.clearLocalErrors();
  }

  static fromUnknown(error: unknown, context?: Record<string, unknown> & { fallbackMessage?: string }): AppError {
    if (isAppError(error)) return error;
    
    const fallbackMessage = context?.fallbackMessage;

    if (error instanceof v.ValiError) {
      const msg = ErrorFormatter.formatValibotError(error);
      return this.create(msg, {
        category: ErrorCategory.VALIDATION,
        userMessage: fallbackMessage ? `${fallbackMessage}: ${msg}` : msg,
        context: { ...context, original: error },
        code: ErrorCode.VALIDATION_FAILED,
        severity: ErrorSeverity.WARNING,
        statusCode: 400,
        traceId: generateTraceId(),
      });
    }

    if (error instanceof Error) {
      return this.create(error.message, { 
        originalError: error,
        userMessage: fallbackMessage || error.message,
        traceId: (error as any).traceId ?? (context?.traceId as string),
        context
      });
    }

    const systemMsg = typeof error === 'string' ? error : this.extractErrorMessage(error);
    return this.create(systemMsg, { 
      userMessage: fallbackMessage || systemMsg,
      context: { raw: error, ...context } 
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
