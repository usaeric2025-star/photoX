import { createStore } from '@storve/core';
import { toast as sonnerToast } from 'sonner';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'loading';
  message: string;
  duration?: number;
  traceId?: string;
  timestamp?: string;
  code?: string;
  systemMessage?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastStoreState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const toastStore = createStore<ToastStoreState>({
  toasts: [],
  addToast: (item) => {
    const id = item.id || Math.random().toString(36).substring(2, 9);
    
    // Bridge to sonner for stability and UX
    const sonnerOptions = {
      id,
      duration: item.duration === 0 ? Infinity : item.duration,
      description: item.traceId ? `Trace ID: ${item.traceId}` : undefined,
      action: item.action ? {
        label: item.action.label,
        onClick: item.action.onClick
      } : undefined
    };

    switch (item.type) {
      case 'success':
        sonnerToast.success(item.message, sonnerOptions);
        break;
      case 'error':
        sonnerToast.error(item.message, sonnerOptions);
        break;
      case 'warning':
        sonnerToast.warning(item.message, sonnerOptions);
        break;
      case 'info':
        sonnerToast.info(item.message, sonnerOptions);
        break;
      case 'loading':
        sonnerToast.loading(item.message, sonnerOptions);
        break;
      default:
        sonnerToast(item.message, sonnerOptions);
    }

    return id;
  },
  removeToast: (id) => {
    sonnerToast.dismiss(id);
  },
  clearAll: () => {
    sonnerToast.dismiss();
  }
});
