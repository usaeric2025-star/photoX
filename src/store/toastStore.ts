import { createStore } from '@storve/core';

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
    toastStore.setState(state => ({
      toasts: [...state.toasts, { ...item, id }]
    }));
    return id;
  },
  removeToast: (id) => {
    toastStore.setState(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  },
  clearAll: () => {
    toastStore.setState({ toasts: [] });
  }
});
