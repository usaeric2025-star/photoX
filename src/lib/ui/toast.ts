import { toast, ExternalToast } from 'sonner';
import React from 'react';
import { copyToClipboard } from '@/utils/clipboard';

/**
 * [UTILITY] showToast
 * Unified toast notification system for PhotoX.
 * Standardizes positioning, duration, and z-index layering.
 */
export const showToast = {
  success: (message: string, options?: ExternalToast) => 
    toast.success(message, { 
      duration: 3000,
      position: 'bottom-center',
      ...options
    }),
    
  error: (messageOrError: string | Error | unknown, options?: ExternalToast) => {
    let userMessage = '發生未知錯誤，請稍後再試';
    let systemMessage = '';
    let stackTrace = '';
    let traceId = '';
    let timestamp = '';
    let code = 'UNKNOWN_ERROR';

    if (messageOrError && typeof messageOrError === 'object') {
      const err = messageOrError as any;
      userMessage = err.userMessage || err.message || userMessage;
      
      // 深度提取系統訊息
      const extractSystemMsg = (e: any): string => {
        let msg = '';
        if (!e) msg = '';
        else if (typeof e === 'string') msg = e;
        else if (e.message) msg = e.message;
        else if (e.error?.message) msg = e.error.message;
        else if (e.error && typeof e.error === 'string') msg = e.error;
        else {
          try {
            msg = JSON.stringify(e);
          } catch (err) {
            msg = String(e);
          }
        }
        
        // 替換過長的 Base64 與截斷超長字串
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
      traceId = err.traceId || '';
      timestamp = err.timestamp || '';
      
      // 提取原因
      const originalErr = err.cause || err.originalError || (err.context && err.context.original);
      if (originalErr) {
        const nestedMsg = extractSystemMsg(originalErr);
        if (nestedMsg && nestedMsg !== systemMessage) {
          systemMessage += ` | 原因: ${nestedMsg}`;
        }
        if (originalErr.stack) {
          stackTrace = originalErr.stack;
        }
      }
      
      if (err.stack && !stackTrace) {
        stackTrace = err.stack;
      }
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
    
    // Copy handler with precise diagnostic fields
    const diagnosticsText = [
      `--- 诊断信息 ---`,
      `时间戳: ${timestamp}`,
      `错误类型: 运行逻辑异常`,
      `代码: ${code}`,
      `Trace ID: ${traceId}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
      `信息: ${systemMessage}`
    ].filter(Boolean).join('\n');
    
    return toast.error(
      React.createElement('div', { className: 'flex flex-col gap-1 w-full text-left' },
        React.createElement('div', { className: 'font-semibold text-sm leading-tight text-red-600' }, userMessage),
        React.createElement('div', { className: 'mt-1 text-[10px] text-slate-400' }, `Trace ID: ${traceId}`)
      ),
      { 
        duration: 8000,
        position: 'bottom-center',
        action: {
          label: '复制诊断',
          onClick: async (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            
            const success = await copyToClipboard(diagnosticsText);
            if (success) {
              toast.success('诊断信息已复制', { id: `copy-${traceId}` });
            } else {
              toast.error('复制失败，请手动选择复制');
            }
          }
        },
        ...options
      }
    );
  },
    
  info: (message: string, options?: ExternalToast) => 
    toast.info(message, { 
      duration: 3000,
      position: 'bottom-center',
      ...options
    }),

  warning: (message: string, options?: ExternalToast) => 
    toast.warning(message, { 
      duration: 4000,
      position: 'bottom-center',
      ...options
    }),
    
  loading: (message: string, options?: ExternalToast) => 
    toast.loading(message, { 
      position: 'bottom-center',
      ...options
    }),
    
  dismiss: (toastId?: string | number) => 
    toast.dismiss(toastId),
};
