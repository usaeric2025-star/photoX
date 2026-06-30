import React from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { createStore } from '@storve/core';
import { useStore, useUI } from '@/lib/store';
import { translations } from '@/locales';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

const confirmStore = createStore<ConfirmState>({
  open: false,
  title: '',
  description: '',
});

const confirmDialog = (options: ConfirmOptions): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    confirmStore.setState({
      ...options,
      open: true,
      resolve,
    });
  });
};

export function useConfirm() {
  return confirmDialog;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const state = useStore(confirmStore);
  const appLang = useUI(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const handleConfirm = () => {
    state.resolve?.(true);
    confirmStore.setState({ ...state, open: false, resolve: undefined });
  };

  const handleCancel = () => {
    state.resolve?.(false);
    confirmStore.setState({ ...state, open: false, resolve: undefined });
  };

  return (
    <>
      {children}
      <ConfirmDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
        title={state.title}
        description={state.description}
        confirmText={state.confirmText || t.confirmText}
        cancelText={t.cancelText}
        variant={state.variant || 'default'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
