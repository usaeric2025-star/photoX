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
        if (!e) return '';
        if (typeof e === 'string') return e;
        if (e.message) return e.message;
        if (e.error?.message) return e.error.message;
        if (e.error && typeof e.error === 'string') return e.error;
        
        try {
          return JSON.stringify(e);
        } catch (err) {
          return String(e);
        }
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
      `--- PHOTX 錯誤診斷報告 ---`,
      `時間戳: ${timestamp}`,
      `錯誤類型: 運行邏輯異常`,
      `代碼: ${code}`,
      `Trace ID: ${traceId}`,
      `當前 URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
      `原始 Message: ${systemMessage}`,
      stackTrace ? `堆棧信息: ${stackTrace}` : ''
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
