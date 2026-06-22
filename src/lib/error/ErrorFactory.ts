import { ErrorCode } from '@/shared/errorCodes';
import { AppError, ErrorSeverity, isAppError, ErrorCategory } from './AppError';
import { showToast } from '@/lib/ui/toast';
import { logger } from '@/lib/logger';

export class ErrorFactory {
  private static mapResourceToChinese(resource: string): string {
    const map: Record<string, string> = {
      photo: '照片',
      Photo: '照片',
      photos: '照片列表',
      Photos: '照片列表',
      category: '分類',
      Category: '分類',
      categories: '分類列表',
      Categories: '分類列表',
      tag: '標籤',
      Tag: '標籤',
      tags: '標籤列表',
      Tags: '標籤列表',
      group: '分組',
      Group: '分組',
      user: '使用者',
      User: '使用者',
      secret: '密鑰',
      Secret: '密鑰',
      furniture: '家具',
      Furniture: '家具',
    };
    return map[resource] ?? resource;
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
      userMessage: '網路連線異常，請檢查您的網路連線',
      originalError,
      code: ErrorCode.NETWORK_ERROR,
      statusCode: 503
    });
  }

  static auth(message: string): AppError {
    return this.create(message, {
      category: ErrorCategory.AUTH,
      userMessage: '登入逾期，請重新登入',
      code: ErrorCode.UNAUTHORIZED,
      statusCode: 401
    });
  }

  static validation(message: string, context?: Record<string, unknown>): AppError {
    return this.create(message, {
      category: ErrorCategory.VALIDATION,
      userMessage: '輸入資料格式不正確，請重新檢查',
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
      userMessage: '系統發生嚴重錯誤，請稍後重試',
      originalError,
      shouldReport: true,
      code: ErrorCode.INTERNAL_ERROR,
      severity: ErrorSeverity.FATAL,
      statusCode: 500
    });
  }

  static notFound(resource: string, id: string): AppError {
    const resourceZh = this.mapResourceToChinese(resource);
    return this.create(`${resource} not found`, {
        category: ErrorCategory.BUSINESS,
        userMessage: `${resourceZh} 不存在`,
        context: { resource, id },
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
        severity: ErrorSeverity.WARNING
    });
  }

  static wrap(error: unknown, action: string, message?: string): AppError {
    const cleanUserMsg = message || this.extractErrorMessage(error);
    const systemMsg = error instanceof Error ? error.message : String(error || '未知錯誤');
    return this.create(systemMsg, {
      category: ErrorCategory.RUNTIME,
      userMessage: cleanUserMsg,
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
      userMessage: '權限不足，拒絕訪問',
      shouldReport: false,
      code: ErrorCode.PERMISSION_DENIED,
      statusCode: 403,
      severity: ErrorSeverity.WARNING
    });
  }

  /** 統一上報入口 (改為純本地記錄) */
  static capture(error: Error | AppError | unknown) {
    const appError = isAppError(error) ? error : ErrorFactory.fromUnknown(error);
    
    // 優先過濾雜音錯誤，避免寫入本地及資料庫日誌
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

    if (isNoise) {
      return;
    }

    if (!appError.shouldReport) {
      logger.info('[Skip Report]', appError.message);
      return;
    }

    // 1. Console 輸出 (精簡結構以便閱讀)
    logger.error('[AppError]', {
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
  static getLocalErrors(): Record<string, unknown>[] {
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
    showToast.error(`${context}失敗: ${msg}`);
  }

  static async logResult(payload: unknown, level: 'success' | 'error', context: unknown) {
    logger.debug('[Audit]', { payload, level, context });
  }
  
  static extractErrorMessage(error: unknown): string {
    if (!error) return '未知錯誤';
    let rawMsg = '';
    if (typeof error === 'string') {
      rawMsg = error;
    } else if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      if (errObj.error && typeof errObj.error === 'string') {
        rawMsg = errObj.error;
      } else if (errObj.message && typeof errObj.message === 'string') {
        rawMsg = errObj.message;
      } else {
        const nestedError = errObj.error as Record<string, unknown> | undefined;
        if (nestedError?.message) {
          rawMsg = String(nestedError.message);
        } else {
          const respData = (errObj.response as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;
          if (respData) {
            if (respData.message) {
              rawMsg = String(respData.message);
            } else {
              const respNestedError = respData.error as Record<string, unknown> | undefined;
              if (respNestedError?.message) {
                rawMsg = String(respNestedError.message);
              }
            }
          }
        }
      }
    }

    if (!rawMsg && error instanceof Error) {
      rawMsg = error.message;
    }

    if (!rawMsg) {
      rawMsg = String(error);
    }

    // 進行英中錯誤訊息轉換，確保「報錯一律只有中文」
    const lowerMsg = rawMsg.toLowerCase();
    if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('network request failed')) {
      return '網路連線異常，請檢查網路';
    }
    if (lowerMsg.includes('network error')) {
      return '網路連線錯誤，請稍後重試';
    }
    if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
      return '請求逾時，請稍後重試';
    }
    if (lowerMsg.includes('unauthorized') || lowerMsg.includes('token expired') || lowerMsg.includes('invalid token')) {
      return '登入已過期，請重新登入';
    }
    if (lowerMsg.includes('permission denied') || lowerMsg.includes('forbidden')) {
      return '權限不足，拒絕執行此操作';
    }
    if (lowerMsg.includes('not found')) {
      return '找不到該項資源';
    }
    if (lowerMsg.includes('conflict') || lowerMsg.includes('already exists')) {
      return '資料紀錄已存在，請勿重複提交';
    }
    if (lowerMsg.includes('validation') || lowerMsg.includes('invalid argument') || lowerMsg.includes('bad request')) {
      return '輸入資料格式不正確';
    }

    if (rawMsg === 'Network Error') return '網路錯誤，請稍後重試';
    if (rawMsg === 'Unknown Error') return '未知的系統錯誤';

    return rawMsg;
  }

  // 以下方法改為 No-op 以保持接口兼容性
  static setUser(user: unknown) {
    logger.debug('[ErrorFactory] setUser:', user);
  }

  static addBreadcrumb(breadcrumb: unknown) {
    logger.debug('[ErrorFactory] addBreadcrumb:', breadcrumb);
  }
}

