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
    const diagnosticsText = `时间戳: ${timestamp}\n错误类型: 运行逻辑异常\nTrace ID: ${traceId}\n原始消息: ${message}`;
    
    return toast.error(
      React.createElement('div', { className: 'flex flex-col gap-1 w-full text-left' },
        React.createElement('div', { className: 'font-semibold text-sm leading-tight text-red-600' }, message),
        React.createElement('div', { className: 'mt-1 text-[10px] text-slate-400' }, `Trace ID: ${traceId}`)
      ),
      { 
        duration: 8000,
        position: 'bottom-center',
        action: {
          label: '复制诊断',
          onClick: (e) => {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            
            let success = false;
            // 1. Try synchronous textarea copy first to verify user-gesture is captured synchronously.
            // This is highly robust inside sandboxed iframes.
            try {
              const textArea = document.createElement('textarea');
              textArea.value = diagnosticsText;
              textArea.setAttribute('readonly', '');
              textArea.style.position = 'absolute';
              textArea.style.left = '-9999px';
              textArea.style.top = `${window.pageYOffset || document.documentElement.scrollTop}px`;
              textArea.style.width = '2px';
              textArea.style.height = '2px';
              textArea.style.padding = '0';
              textArea.style.border = 'none';
              textArea.style.outline = 'none';
              textArea.style.boxShadow = 'none';
              textArea.style.background = 'transparent';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              
              // For iOS / mobile devices:
              const range = document.createRange();
              range.selectNodeContents(textArea);
              const selection = window.getSelection();
              if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
              }
              textArea.setSelectionRange(0, 999999);
              
              success = document.execCommand('copy');
              document.body.removeChild(textArea);
            } catch (err) {
              console.warn('Synchronous copy failed in toast action, trying navigator.clipboard:', err);
            }

            // 2. Fall back to navigator.clipboard if synchronous copy failed
            if (success) {
              toast.success('诊断信息已复制', { id: `copy-${traceId}` });
            } else if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(diagnosticsText)
                .then(() => toast.success('诊断信息已复制', { id: `copy-${traceId}` }))
                .catch((err) => {
                  console.error('navigator.clipboard failed inside toast action:', err);
                  toast.error('复制失败，请重试');
                });
            } else {
              toast.error('复制失败，请重试');
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
