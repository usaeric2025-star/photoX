import { toast, ExternalToast } from 'sonner';
import React from 'react';

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
    
  error: (message: string, options?: ExternalToast) => {
    const traceId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const timestamp = new Date().toISOString();
    
    // Copy handler with precise diagnostic fields
    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const diagnosticsText = `时间戳: ${timestamp}\n错误类型: 运行逻辑异常\n代码: ERR_MUTATION\nTrace ID: ${traceId}\n原始消息: ${message}`;
      
      navigator.clipboard.writeText(diagnosticsText).then(() => {
        toast.success('诊断信息已复制', { id: 'copy-success' });
      }).catch(() => {
        toast.error('复制失败，请重试');
      });
    };

    return toast.error(
      React.createElement('div', { className: 'flex flex-col gap-1 w-full text-left' },
        React.createElement('div', { className: 'font-semibold text-sm leading-tight text-red-600' }, message),
        React.createElement('div', { className: 'flex items-center justify-between gap-4 mt-2 text-[10px] text-slate-400' },
          React.createElement('span', null, `Trace ID: ${traceId}`),
          React.createElement('button', {
            type: 'button',
            onClick: handleCopy,
            className: 'px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold active:scale-95 transition-all border border-red-200 cursor-pointer pointer-events-auto'
          }, '复制诊断信息')
        )
      ),
      { 
        duration: 8000,
        position: 'bottom-center',
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
