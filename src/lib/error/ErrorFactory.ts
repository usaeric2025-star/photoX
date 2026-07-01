import * as v from 'valibot';
import { ErrorCode } from '@/shared/errorCodes';
import { AppError, ErrorSeverity, isAppError, ErrorCategory } from './AppError';
import { showToast } from '@/lib/ui/toast';
import { logger } from '@/lib/logger';
import { generateTraceId } from '@/lib/utils';
import { translations, TranslationType } from '@/locales';

export class ErrorFactory {
  private static get t(): TranslationType {
    const lang = (typeof document !== 'undefined' && document.documentElement?.dataset?.lang) as keyof typeof translations || 'en';
    return translations[lang] || translations.en;
  }

  private static mapResourceToLocalized(resource: string): string {
    const t = this.t;
    const map: Record<string, string> = {
      photo: t.furniture,
      Photo: t.furniture,
      photos: t.galleryName,
      Photos: t.galleryName,
      category: t.category,
      Category: t.category,
      tag: t.tags,
      Tag: t.tags,
      group: t.furniture, // closest fallback
      Group: t.furniture,
      user: t.login,
      User: t.login,
    };
    return map[resource] ?? resource;
  }

  static formatValibotError(error: v.ValiError<v.GenericSchema>): string {
    return error.issues.map((issue) => {
      // 嘗試獲取友善的路徑名稱
      const path = issue.path?.map((p) => String((p as any).key)).join('.') || '参数';
      // 格式化訊息：將欄位名稱與驗證錯誤連結
      return `${path} ${issue.message}`;
    }).join('，');
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
    const t = this.t;
    return this.create(message, {
      category: ErrorCategory.VALIDATION,
      userMessage: t.invalidDataFormat || '输入数据格式不正确',
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
    const resourceLocalized = this.mapResourceToLocalized(resource);
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
    const t = this.t;
    const opLocalized = operation; // TODO: map operation
    const resLocalized = resource ? this.mapResourceToLocalized(resource) : '';
    const cleanUserMsg = resource ? `${opLocalized}${resLocalized}${t.saveFailed}` : `${opLocalized}${t.saveFailed}`;
    const systemMsg = error instanceof Error ? error.message : String(error || t.unknown);
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

  /** 统一上报入口 (改为纯本地记录) */
  static capture(error: Error | AppError | unknown) {
    const appError = isAppError(error) ? error : ErrorFactory.fromUnknown(error);
    
    // 优先过滤噪音错误，避免写入本地及数据库日志
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

    // 1. Console 输出 (精简结构以便阅读)
    logger.error('[AppError]', {
      message: appError.message,
      category: appError.category,
      traceId: appError.traceId,
      context: appError.context,
      userMessage: appError.userMessage,
      stack: (error as Error)?.stack
    });

    // 3. 後端日誌入庫 (僅在 Node 環境)
    // 注意：此處已移除直接導入 DB 的邏輯，避免 Vite 將 server-only 的 postgres 套件捆綁進前端
    if (typeof process !== 'undefined' && process.versions?.node) {
        // 如果需要在 Node 環境（如 server.ts）中使用此 ErrorFactory 記錄日誌，
        // 建議透過依賴注入或專用的 server-side logger 處理，而非在此處動態導入。
    }

    // 2. 本地持久化记录 (供诊断面板读取)
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
      
      // 只保留最近 50 条记录
      const limitedErrors = errors.slice(-50);
      
      try {
        localStorage.setItem(key, JSON.stringify(limitedErrors));
      } catch (storageError) {
        // 如果 QuotaExceededError (localStorage 满了)，先清空再试一次
        localStorage.removeItem(key);
        localStorage.setItem(key, JSON.stringify([errorEntry]));
      }
    } catch (e) {
      // 静默失败，不影响业务
    }
  }

  /** 诊断面板读取接口 */
  static getLocalErrors(): Record<string, unknown>[] {
    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]');
    } catch (_) {
      return [];
    }
  }

  /** 诊断面板清理接口 */
  static clearLocalErrors() {
    try {
      localStorage.removeItem('app_errors');
    } catch (_) {}
  }

  static fromUnknown(error: unknown, context?: Record<string, unknown>): AppError {
    if (isAppError(error)) return error;
    
    if (error instanceof v.ValiError) {
      return this.create(this.formatValibotError(error), {
        category: ErrorCategory.VALIDATION,
        userMessage: this.formatValibotError(error),
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
    
    return this.create(typeof error === 'string' ? error : '未知错误', { 
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
    
    // 统一使用 showToast.error，传递 AppError 对象以便深度提取 TraceID 和详细的诊断信息
    if (typeof window !== 'undefined') {
      showToast.error(appError);
    }
  }
  
  static extractErrorMessage(error: unknown): string {
    if (!error) return '未知错误';
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
      rawMsg = String(error || '未知错误');
    }

    if (rawMsg.trim() === '' || rawMsg === '[object Object]') {
      rawMsg = '未知系統錯誤 (未提供詳細訊息)';
    }

    // 进行英中错误信息转换，确保「报错一律只有中文」
    const lowerMsg = rawMsg.toLowerCase();
    if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('network request failed')) {
      return '网络连接异常，请检查网络';
    }
    if (lowerMsg.includes('network error')) {
      return '网络连接错误，请稍后重试';
    }
    if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
      return '请求超时，请稍后重试';
    }
    if (lowerMsg.includes('unauthorized') || lowerMsg.includes('token expired') || lowerMsg.includes('invalid token')) {
      return '登录已过期，请重新登录';
    }
    if (lowerMsg.includes('permission denied') || lowerMsg.includes('forbidden')) {
      return '权限不足，拒绝执行此操作';
    }
    if (lowerMsg.includes('not found')) {
      return '找不到该项资源';
    }
    if (lowerMsg.includes('conflict') || lowerMsg.includes('already exists')) {
      return '数据记录已存在，请勿重复提交';
    }
    if (lowerMsg.includes('validation') || lowerMsg.includes('invalid argument') || lowerMsg.includes('bad request')) {
      return '输入数据格式不正确';
    }

    if (rawMsg === 'Network Error') return '网络错误，请稍后重试';
    if (rawMsg === 'Unknown Error') return '未知的系统错误';

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
