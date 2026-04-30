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

interface PromptDialogProps {
  dialog: { title: string, message?: string, placeholder?: string, onSubmit: (val: string) => void } | null;
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
          <Input 
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dialog?.placeholder}
            autoFocus
          />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (dialog) dialog.onSubmit(value);
            onClose();
          }}>确定</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
