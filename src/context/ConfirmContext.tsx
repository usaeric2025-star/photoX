import React from 'react';
import { ConfirmDialog } from '#src/components/ui/ConfirmDialog.js';
import { signal } from '@preact/signals-react';
import { useTranslation } from '#src/hooks/index.js';
import { useSignal } from '#lib/store/index.js';

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

const confirmStateSignal = signal<ConfirmState>({
  open: false,
  title: '',
  description: '',
});

const confirmStore = {
  getState: () => confirmStateSignal.value,
  setState: (updates: Partial<ConfirmState>) => {
    confirmStateSignal.value = { ...confirmStateSignal.value, ...updates };
  }
};

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
  const state = useSignal(confirmStateSignal);
  const { t } = useTranslation();

  const handleConfirm = () => {
    state.resolve?.(true);
    confirmStore.setState({ open: false, resolve: undefined });
  };

  const handleCancel = () => {
    state.resolve?.(false);
    confirmStore.setState({ open: false, resolve: undefined });
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
        confirmText={state.confirmText || t('confirmText')}
        cancelText={t('cancelText')}
        variant={state.variant || 'default'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
