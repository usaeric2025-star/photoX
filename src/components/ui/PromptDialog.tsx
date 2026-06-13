import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/shared/Input';
import { useUIStore } from '@/store/useUIStore';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void | Promise<void>;
}

export const PromptDialog = ({
  open,
  onOpenChange,
  title,
  description,
  defaultValue = '',
  placeholder,
  onConfirm,
}: PromptDialogProps) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      useUIStore.getState().incrementDialogCount();
    }
  }, [open, defaultValue]);

  const handleClose = () => {
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
    <Modal open={open} onClose={handleClose} hidePadding>
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500 mt-2">{description}</p>
        )}
        <div className="mt-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-3 flex-col sm:flex-row">
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-2 hover:bg-slate-100 rounded-md transition-colors"
            onClick={handleClose}
          >
            取消
          </button>
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
            onClick={handleConfirm}
          >
            確認
          </button>
        </div>
      </div>
    </Modal>
  );
};
