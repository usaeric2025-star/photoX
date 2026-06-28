import { toastStore } from '@/store/toastStore';
import { copyToClipboard } from '@/utils/clipboard';

export interface ExternalToast {
  duration?: number;
  traceId?: string;
  id?: string | number;
}

export const showToast = {
  success: (message: string, options?: ExternalToast) => 
    toastStore.getState().addToast({
      id: options?.id ? String(options.id) : undefined,
      type: 'success',
      message,
      duration: options?.duration,
    }),
    
  error: (messageOrError: string | Error | unknown, options?: ExternalToast) => {
    let userMessage = '發生未知錯誤，請稍後再試';
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
        cause?: unknown;
        originalError?: unknown;
        context?: { original?: unknown };
        stack?: string;
        error?: { message?: string } | string;
      }
      
      const err = messageOrError as AppErrorLike & Record<string, unknown>;
      userMessage = err.userMessage || err.message || userMessage;
      
      const extractSystemMsg = (e: unknown): string => {
        let msg = '';
        if (!e) msg = '';
        else if (typeof e === 'string') msg = e;
        else if (typeof e === 'object') {
          const obj = e as Record<string, unknown>;
          if (obj.message) msg = String(obj.message);
          else if (obj.error && typeof obj.error === 'object') {
            const nestedErr = obj.error as Record<string, unknown>;
            if (nestedErr.message) msg = String(nestedErr.message);
          } else if (obj.error && typeof obj.error === 'string') {
            msg = obj.error;
          } else {
            try {
              msg = JSON.stringify(e);
            } catch {
              msg = String(e);
            }
          }
        } else {
          msg = String(e);
        }
        
        if (msg) {
          msg = msg.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[BASE64_IMAGE_TRUNCATED]');
          if (msg.length > 500) {
            msg = msg.substring(0, 500) + `... (內容過長已截斷，原始長度: ${msg.length})`;
          }
        }
        return msg;
      };

      systemMessage = extractSystemMsg(err);
      code = err.code || 'UNKNOWN_ERROR';
      traceId = err.traceId || traceId;
      timestamp = err.timestamp || '';
    } else {
      userMessage = String(messageOrError || userMessage);
    }

    if (!traceId) {
      traceId = Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    if (!timestamp) {
      timestamp = new Date().toLocaleString('zh-CN');
    }
    if (!systemMessage || systemMessage === '[object Object]') {
      systemMessage = userMessage;
    }
    
    const diagnosticsText = [
      `--- 诊断信息 ---`,
      `时间戳: ${timestamp}`,
      `错误类型: 运行逻辑异常`,
      `代码: ${code}`,
      `Trace ID: ${traceId}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
      `信息: ${systemMessage}`
    ].filter(Boolean).join('\n');
    
    return toastStore.getState().addToast({
      type: 'error',
      message: userMessage,
      traceId,
      duration: 8000,
      action: {
        label: '複製診斷',
        onClick: async () => {
          const success = await copyToClipboard(diagnosticsText);
          if (success) {
            toastStore.getState().addToast({
              type: 'success',
              message: '診斷信息已複製',
              duration: 2000,
            });
          } else {
            toastStore.getState().addToast({
              type: 'error',
              message: '複製失敗，請手動選擇複製',
              duration: 3000,
            });
          }
        }
      }
    });
  },
    
  info: (message: string, options?: ExternalToast) => 
    toastStore.getState().addToast({
      id: options?.id ? String(options.id) : undefined,
      type: 'info',
      message,
      duration: options?.duration,
    }),

  warning: (message: string, options?: ExternalToast) => 
    toastStore.getState().addToast({
      id: options?.id ? String(options.id) : undefined,
      type: 'warning',
      message,
      duration: options?.duration || 4000,
    }),
    
  loading: (message: string, options?: ExternalToast) => 
    toastStore.getState().addToast({
      id: options?.id ? String(options.id) : undefined,
      type: 'loading',
      message,
    }),
    
  dismiss: (toastId?: string) => {
    if (toastId) {
      toastStore.getState().removeToast(toastId);
    } else {
      toastStore.getState().clearAll();
    }
  }
};
