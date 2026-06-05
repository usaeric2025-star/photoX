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

interface MenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  primaryActionLabel: string;
  primaryActionVariant?: 'default' | 'destructive';
  onPrimaryAction: () => void | Promise<void>;
  secondaryActionLabel: string;
  onSecondaryAction: () => void | Promise<void>;
}

export const MenuDialog = ({
  open,
  onOpenChange,
  title,
  description,
  primaryActionLabel,
  primaryActionVariant = 'default',
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: MenuDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2">
            <AlertDialogAction 
                onClick={onSecondaryAction}
                className="bg-slate-100 text-slate-900 hover:bg-slate-200"
            >
                {secondaryActionLabel}
            </AlertDialogAction>
            <AlertDialogAction 
                onClick={onPrimaryAction}
                className={primaryActionVariant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
                {primaryActionLabel}
            </AlertDialogAction>
            <AlertDialogCancel>取消</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
