import { logger } from '@/lib/logger';
import * as React from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { useUIStore } from '@/store/useUIStore';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'default',
}: ConfirmDialogProps) => {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (e) {
      logger.error("[ConfirmDialog] execution failed:", e);
    } finally {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <NativeDialog 
      id="confirm-dialog"
      open={open} 
      onClose={handleCancel} 
      title={title} 
      description={description}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors active:scale-95"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-white font-bold transition-all active:scale-95 shadow-md ${
              variant === 'destructive' 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </NativeDialog>
  );
};
