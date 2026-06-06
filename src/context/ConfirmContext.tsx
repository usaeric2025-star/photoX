import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUIStore } from '@/store/useUIStore';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [resolveConfirm, setResolveConfirm] = useState<(value: boolean) => void>();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', description: '' });
  const updateStore = useUIStore(s => s.update);

  useEffect(() => {
    updateStore({ isGlobalDialogOpen: open });
  }, [open, updateStore]);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOptions(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveConfirm(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    resolveConfirm?.(true);
    setOpen(false);
  };

  const handleCancel = () => {
    resolveConfirm?.(false);
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText || '确定'}
        variant={options.variant || 'default'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};
