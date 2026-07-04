import { toast } from 'sonner';
import { copyToClipboard } from '#src/utils/clipboard.js';

export interface ExternalToast {
  duration?: number;
  traceId?: string;
  id?: string | number;
}

export const showToast = {
  success: (message: string, options?: ExternalToast) => 
    toast.success(message, {
      id: options?.id,
      duration: options?.duration,
    }),
    
  error: (messageOrError: string | Error | unknown, options?: ExternalToast) => {
    let userMessage = '系统错误';
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
        error?: { message?: string } | string;
      }
      
      const err = messageOrError as AppErrorLike & Record<string, unknown>;
      userMessage = err.userMessage || err.message || userMessage;
      
      const extractSystemMsg = (e: unknown): string => {
        if (!e) return '';
        if (typeof e === 'string') return e;
        const obj = e as Record<string, unknown>;
        if (obj.message) return String(obj.message);
        return JSON.stringify(e).substring(0, 500);
      };

      systemMessage = extractSystemMsg(err);
      code = err.code || 'UNKNOWN_ERROR';
      traceId = err.traceId || traceId;
      timestamp = err.timestamp || '';
    } else {
      userMessage = String(messageOrError || userMessage);
    }

    if (!traceId) traceId = Math.random().toString(36).substring(2, 10).toUpperCase();
    if (!timestamp) timestamp = new Date().toLocaleString('zh-CN');
    
    const diagnosticsText = [
      `--- 诊断报告 ---`,
      `时间: ${timestamp}`,
      `代码: ${code}`,
      `ID: ${traceId}`,
      `信息: ${systemMessage || userMessage}`
    ].join('\n');
    
    return toast.error(userMessage, {
      id: options?.id,
      duration: options?.duration || 6000,
      action: {
        label: '复制诊断',
        onClick: async () => {
          const success = await copyToClipboard(diagnosticsText);
          if (success) toast.success('已复制诊断信息');
          else toast.error('复制失败');
        }
      }
    });
  },
    
  info: (message: string, options?: ExternalToast) => 
    toast.info(message, {
      id: options?.id,
      duration: options?.duration || 3000,
    }),

  warning: (message: string, options?: ExternalToast) => 
    toast.warning(message, {
      id: options?.id,
      duration: options?.duration || 4000,
    }),
    
  loading: (message: string, options?: ExternalToast) => 
    toast.loading(message, {
      id: options?.id,
    }),
    
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  }
};
