import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

import { DialogData } from '../../types';

interface PromptDialogProps {
  dialog: DialogData | null;
  onClose: () => void;
}

export const PromptDialog: React.FC<PromptDialogProps> = ({ dialog, onClose }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (dialog) setValue('');
  }, [dialog]);

  return (
    <AlertDialog open={!!dialog} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialog?.message}
          </AlertDialogDescription>
          <div className="mt-4">
            <Input 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={dialog?.placeholder}
              autoFocus
              className="rounded-xl border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all h-11"
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            取消 / CANCEL
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              if (dialog?.onSubmit) dialog.onSubmit(value);
              onClose();
            }}
          >
            确定 / OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
