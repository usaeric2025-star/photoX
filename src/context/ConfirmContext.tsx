import React from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { createStore } from '@storve/core';
import { useStore } from '@/lib/store';

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

export const confirmDialog = (options: ConfirmOptions): Promise<boolean> => {
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
        confirmText={state.confirmText || '确定'}
        variant={state.variant || 'default'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
