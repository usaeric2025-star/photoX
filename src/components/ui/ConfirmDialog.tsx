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
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) useUIStore.getState().incrementDialogCount();
    else useUIStore.getState().decrementDialogCount();
    onOpenChange(isOpen);
  };
  
  const handleConfirm = async () => {
    onOpenChange(false);
    useUIStore.getState().decrementDialogCount();
    try {
      await onConfirm();
    } catch (e) {
      console.error("[ConfirmDialog] execution failed:", e);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
    useUIStore.getState().decrementDialogCount();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
