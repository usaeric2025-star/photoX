import { useState, useEffect } from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { Input } from '@/components/shared/Input';
import { useUIStore } from '@/store/useUIStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useFormField } from '@/lib/form/useFormField';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => any;
  loading?: boolean;
  fieldName?: string;
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
  fieldName = 'name'
}: PromptDialogProps) => {
  const [value, setValue] = useState(defaultValue);
  const { error, onChange: clearError } = useFormField(fieldName);

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
    const result = await onConfirm(value);
    // If it returns explicitly false, we don't close. (e.g. useFormSubmit returns false on error)
    if (result === false) return;
    
    onOpenChange(false);
    useUIStore.getState().decrementDialogCount();
    setValue('');
    if (clearError) clearError();
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
            error={error}
            onChange={(e) => {
              setValue(e.target.value);
              if (clearError) clearError();
            }}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleConfirm();
            }}
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-3 flex-col sm:flex-row">
          <Button
            type="button"
            disabled={loading}
            variant="ghost"
            onClick={handleClose}
          >
            取消
          </Button>
          <Button
            type="button"
            loading={loading}
            variant="primary"
            onClick={handleConfirm}
          >
            確認
          </Button>
        </div>
      </div>
    </NativeDialog>
  );
};
