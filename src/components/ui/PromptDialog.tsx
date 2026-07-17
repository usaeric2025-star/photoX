import { useState, useEffect } from 'react';
import { Modal } from '#src/components/ui/Modal.js';
import { Input } from '#src/components/shared/Input.js';
import {  incrementDialogCount, decrementDialogCount } from '#lib/store/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { useFormField } from '#lib/forms/useFormField.js';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void | boolean | Promise<void | boolean>;
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
      incrementDialogCount();
    }
  }, [open, defaultValue]);

  const handleClose = () => {
    if (loading) return;
    onOpenChange(false);
    decrementDialogCount();
  };

  const handleConfirm = async () => {
    const result = await onConfirm(value);
    // If it returns explicitly false, we don't close. (e.g. useFormSubmit returns false on error)
    if (result === false) return;
    
    onOpenChange(false);
    decrementDialogCount();
    setValue('');
    if (clearError) clearError();
  };

  return (
    <Modal id="prompt-dialog" open={open} onClose={handleClose} hidePadding>
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
            确认
          </Button>
        </div>
      </div>
    </Modal>
  );
};
