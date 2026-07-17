import React from 'react';
import { ConfirmDialog } from '#src/components/ui/ConfirmDialog.js';
import { atom, useAtomValue, getDefaultStore } from 'jotai';
import { useTranslation } from '#src/hooks/index.js';

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

const confirmStateAtom = atom<ConfirmState>({
  open: false,
  title: '',
  description: '',
});

const store = getDefaultStore();

const confirmStore = {
  getState: () => store.get(confirmStateAtom),
  setState: (updates: Partial<ConfirmState>) => {
    store.set(confirmStateAtom, { ...store.get(confirmStateAtom), ...updates });
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
  const state = useAtomValue(confirmStateAtom);
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
