import { ErrorCode } from '@/shared/errorCodes';
import { AppError, ErrorSeverity, isAppError, ErrorCategory } from './AppError';

export class ErrorFactory {
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
        (options.category !== ErrorCategory.BUSINESS && options.category !== ErrorCategory.VALIDATION)
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
      userMessage: '網絡錯誤，請稍後重試',
      originalError,
      code: ErrorCode.NETWORK_ERROR,
      statusCode: 503
    });
  }

  static auth(message: string): AppError {
    return this.create(message, {
      category: ErrorCategory.AUTH,
      userMessage: '請重新登入',
      code: ErrorCode.UNAUTHORIZED,
      statusCode: 401
    });
  }

  static validation(message: string, context?: Record<string, unknown>): AppError {
    return this.create(message, {
      category: ErrorCategory.VALIDATION,
      userMessage: '請檢查輸入資料',
      context,
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
      userMessage: '系統發生嚴重錯誤',
      originalError,
      shouldReport: true,
      code: ErrorCode.INTERNAL_ERROR,
      severity: ErrorSeverity.FATAL,
      statusCode: 500
    });
  }

  static notFound(resource: string, id: string): AppError {
    return this.create(`${resource} not found`, {
        category: ErrorCategory.BUSINESS,
        userMessage: `${resource} 不存在`,
        context: { resource, id },
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
        severity: ErrorSeverity.WARNING
    });
  }

  static wrap(error: unknown, action: string, message?: string): AppError {
    return this.create(message || (error instanceof Error ? error.message : '未知錯誤'), {
      category: ErrorCategory.RUNTIME,
      originalError: error,
      context: { action },
      shouldReport: true,
      code: ErrorCode.UNKNOWN_ERROR,
      statusCode: 500
    });
  }
  
  static permission(message: string): AppError {
    return this.create(message, {
      category: ErrorCategory.AUTH,
      userMessage: '權限不足',
      shouldReport: false,
      code: ErrorCode.PERMISSION_DENIED,
      statusCode: 403,
      severity: ErrorSeverity.WARNING
    });
  }

  /** 統一上報入口 (改為純本地記錄) */
  static capture(error: Error | AppError | unknown) {
    const appError = isAppError(error) ? error : ErrorFactory.fromUnknown(error);
    
    if (!appError.shouldReport) {
      console.info('[Skip Report]', appError.message);
      return;
    }

    // 1. Console 輸出 (精簡結構以便閱讀)
    console.error('[AppError]', {
      message: appError.message,
      category: appError.category,
      traceId: appError.traceId,
      context: appError.context,
      userMessage: appError.userMessage,
      stack: (error as Error)?.stack
    });

    // 2. 本地持久化記錄 (供診斷面板讀取)
    try {
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
      
      // 只保留最近 50 條記錄
      const limitedErrors = errors.slice(-50);
      
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(limitedErrors));
        } catch (storageError) {
          // 如果 QuotaExceededError (localStorage 滿了)，先清空再試一次
          localStorage.removeItem(key);
          localStorage.setItem(key, JSON.stringify([errorEntry]));
        }
      }
    } catch (e) {
      // 靜默失敗，不影響業務
    }
  }

  /** 診斷面板讀取接口 */
  static getLocalErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch (_) {
      return [];
    }
  }

  /** 診斷面板清理接口 */
  static clearLocalErrors() {
    try {
      localStorage.removeItem('app_errors');
    } catch (_) {}
  }

  static fromUnknown(error: unknown): AppError {
    if (isAppError(error)) return error;
    
    if (error instanceof Error) {
      return this.create(error.message, { originalError: error });
    }
    
    return this.create(typeof error === 'string' ? error : '未知錯誤', { 
      context: { raw: error } 
    });
  }
  
  static handleError(error: unknown, context: string, silent: boolean = false): void {
    if (silent) return;
    this.capture(error);
    const msg = this.extractErrorMessage(error);
    import('@/lib/ui/toast').then(({ showToast }) => {
      showToast.error(`${context}失败: ${msg}`);
    });
  }

  static async logResult(payload: any, level: 'success' | 'error', context: any) {
    // 審計日誌實現在此保留 Console 版
    console.log('[Audit]', { payload, level, context });
  }
  
  static extractErrorMessage(error: unknown): string {
    if (!error) return '未知错误';
    if (typeof error === 'string') return error;

    if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      if (errObj.error && typeof errObj.error === 'string') return errObj.error;
      if (errObj.message && typeof errObj.message === 'string') return errObj.message;
      
      const nestedError = errObj.error as Record<string, unknown> | undefined;
      if (nestedError?.message) return String(nestedError.message);
      
      const respData = (errObj.response as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;
      if (respData) {
        if (respData.message) return String(respData.message);
        const respNestedError = respData.error as Record<string, unknown> | undefined;
        if (respNestedError?.message) return String(respNestedError.message);
      }
    }

    if (error instanceof Error) return error.message;

    return String(error);
  }

  // 以下方法改為 No-op 以保持接口兼容性
  static setUser(user: any) {
    console.debug('[ErrorFactory] setUser:', user);
  }

  static addBreadcrumb(breadcrumb: any) {
    console.debug('[ErrorFactory] addBreadcrumb:', breadcrumb);
  }
}

