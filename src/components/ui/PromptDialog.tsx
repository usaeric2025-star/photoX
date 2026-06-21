import { useState, useEffect } from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { Input } from '@/components/shared/Input';
import { useUIStore } from '@/store/useUIStore';
import { Icon } from '@/components/ui/Icon';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void | Promise<void>;
  loading?: boolean;
}

export const PromptDialog = ({
  open,
  onOpenChange,
  title,
  description,
  defaultValue = '',
  placeholder,
  onConfirm,
  loading,
}: PromptDialogProps) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      useUIStore.getState().incrementDialogCount();
    }
  }, [open, defaultValue]);

  const handleClose = () => {
    if (loading) return;
    onOpenChange(false);
    useUIStore.getState().decrementDialogCount();
  };

  const handleConfirm = async () => {
    await onConfirm(value);
    onOpenChange(false);
    useUIStore.getState().decrementDialogCount();
    setValue('');
  };

  return (
    <NativeDialog id="prompt-dialog" open={open} onClose={handleClose} hidePadding>
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500 mt-2">{description}</p>
        )}
        <div className="mt-4">
          <Input
            value={value}
            disabled={loading}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleConfirm();
            }}
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-3 flex-col sm:flex-row">
          <button
            type="button"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
            onClick={handleClose}
          >
            取消
          </button>
          <button
            type="button"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            onClick={handleConfirm}
          >
            {loading && <Icon name="refresh-ccw" size={16} className="animate-spin" />}
            確認
          </button>
        </div>
      </div>
    </NativeDialog>
  );
};
