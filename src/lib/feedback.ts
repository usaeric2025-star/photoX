import { toast } from 'sonner';
import { copyToClipboard } from '#src/utils/clipboard.js';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ExternalToast {
  duration?: number;
  traceId?: string;
  id?: string | number;
}

/**
 * feedback
 * 統一的 UI 反饋工具函數，封裝自 sonner。
 */
export const feedback = {
  show: (type: ToastType, message: string, duration?: number) => {
    const fn = toast[type];
    fn(message, { duration: duration ?? 3000 });
  },

  success: (message: string, options?: ExternalToast) => 
    toast.success(message, { 
      id: options?.id,
      duration: options?.duration ?? 3000 
    }),

  error: (messageOrError: string | Error | unknown, options?: ExternalToast) => {
    let userMessage = '系統錯誤';
    let systemMessage = '';
    let traceId = options?.traceId || '';
    let timestamp = '';
    let code = 'UNKNOWN_ERROR';

    if (messageOrError && typeof messageOrError === 'object') {
      interface AppErrorLike {
        userMessage?: string;
        message?: string;
        code?: string;
        traceId?: string;
        timestamp?: string;
        error?: { message?: string; code?: string; traceId?: string } | string;
        context?: Record<string, unknown>;
        cause?: unknown;
      }
      
      const err = messageOrError as AppErrorLike & Record<string, unknown>;
      userMessage = err.userMessage || err.message || userMessage;

      const extractSystemMsg = (e: unknown): string => {
        if (!e) return '';
        if (typeof e === 'string') return e;
        const obj = e as Record<string, unknown>;
        
        let details = '';
        if (obj.context && typeof obj.context === 'object') {
          const ctx = obj.context as Record<string, unknown>;
          
          if (Array.isArray(ctx.failures)) {
            const failLines = ctx.failures
              .map(f => `${f.name || '文件'}: ${f.error || '未知錯誤'}`)
              .join(', ');
            if (failLines) details += ` [詳細失敗原因: ${failLines}]`;
          } else if (ctx.fields && typeof ctx.fields === 'object') {
            details += ` [驗證詳情: ${JSON.stringify(ctx.fields)}]`;
          }

          if (ctx.originalError) details += ' \n↳ 原因: ' + extractSystemMsg(ctx.originalError);
          else if (ctx.original) details += ' \n↳ 原因: ' + extractSystemMsg(ctx.original);
        }

        if (obj.cause) details += ' \n↳ 內部原因: ' + extractSystemMsg(obj.cause);
        if (obj.message) return String(obj.message) + details;
        return JSON.stringify(e).substring(0, 500) + details;
      };

      systemMessage = extractSystemMsg(err);

      if (err.error && typeof err.error === 'object') {
        const nested = err.error as Record<string, unknown>;
        code = String(nested.code || err.code || 'UNKNOWN_ERROR');
        traceId = String(nested.traceId || err.traceId || traceId);
      } else {
        code = String(err.code || 'UNKNOWN_ERROR');
        traceId = String(err.traceId || traceId);
      }
      timestamp = err.timestamp || '';
    } else {
      userMessage = String(messageOrError || userMessage);
    }

    if (!traceId) traceId = crypto.randomUUID();
    if (!timestamp) timestamp = new Date().toLocaleString('zh-TW');

    const diagnosticsText = [
      `--- 診斷報告 ---`,
      `時間: ${timestamp}`,
      `代碼: ${code}`,
      `ID: ${traceId}`,
      `信息: ${systemMessage || userMessage}`
    ].join('\n');

    return toast.error(userMessage, {
      id: options?.id || traceId,
      duration: options?.duration || 6000,
      action: {
        label: '複製診斷',
        onClick: async () => {
          const success = await feedback.copyDiagnostics(diagnosticsText);
          if (success) feedback.success('已複製診斷信息');
          else feedback.error('複製失敗');
        }
      }
    });
  },

  info: (message: string, options?: ExternalToast) => 
    toast.info(message, {
      duration: options?.duration || 3000,
    }),

  warning: (message: string, options?: ExternalToast) => 
    toast.warning(message, {
      duration: options?.duration || 4000,
    }),

  /**
   * promise
   * 用於異步操作的反饋，會自動顯示 loading -> success/error 狀態切換。
   */
  promise: async <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error?: string | ((err: { message: string }) => string) }
  ): Promise<T> => {
    toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error || '操作失敗',
    });
    return await promise;
  },

  loading: (message: string, options?: ExternalToast) => 
    toast.loading(message, {
      id: options?.id,
    }),

  dismiss: (id?: string | number) => toast.dismiss(id),
  
  update: (id: string | number, message: string, type: ToastType = 'success') => {
    const fn = toast[type];
    fn(message, { id, duration: 3000 });
  },

  /**
   * 內部輔助：複製診斷信息
   */
  async copyDiagnostics(text: string): Promise<boolean> {
    try {
      await copyToClipboard(text);
      return true;
    } catch {
      return false;
    }
  }
};
