import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
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

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) useUIStore.getState().incrementDialogCount();
    else useUIStore.getState().decrementDialogCount();
    onOpenChange(isOpen);
  };

  const handleConfirm = async () => {
    await onConfirm(value);
    onOpenChange(false);
    useUIStore.getState().decrementDialogCount();
    setValue('');
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>確認</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
