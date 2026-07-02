import { NativeDialog } from '#src/components/ui/NativeDialog.js';
import { cn } from '#lib/utils.js';

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
  const handleClose = () => onOpenChange(false);

  return (
    <NativeDialog id="menu-dialog" open={open} onClose={handleClose} hidePadding>
      <div className="p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500 mt-2">{description}</p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="w-full px-4 py-2 bg-slate-100 text-slate-900 rounded-md hover:bg-slate-200 transition-colors font-medium"
            onClick={() => {
              onSecondaryAction();
              handleClose();
            }}
          >
            {secondaryActionLabel}
          </button>
          <button
            type="button"
            className={cn(
              "w-full px-4 py-2 rounded-md transition-colors font-medium text-white",
              primaryActionVariant === 'destructive' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-slate-900 hover:bg-slate-800'
            )}
            onClick={() => {
              onPrimaryAction();
              handleClose();
            }}
          >
            {primaryActionLabel}
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors mt-2"
            onClick={handleClose}
          >
            取消
          </button>
        </div>
      </div>
    </NativeDialog>
  );
};
