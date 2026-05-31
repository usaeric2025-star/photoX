import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X } from 'lucide-react';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { PromptDialog } from './PromptDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export const AdminGlobalModals: React.FC = () => {
  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog } = useGalleryStore(useShallow(s => ({
    alertDialog: s.alertDialog,
    setAlertDialog: s.setAlertDialog,
    promptDialog: s.promptDialog,
    setPromptDialog: s.setPromptDialog
  })));

  return (
    <>
      <AlertDialog 
        open={!!alertDialog} 
        onOpenChange={(open) => {
          if (!open) {
            if (alertDialog?.onCancel) alertDialog.onCancel();
            setAlertDialog(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog?.title}</AlertDialogTitle>
            <div className="text-sm leading-relaxed text-slate-500 text-left w-full mt-2">
              {alertDialog?.message}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertDialog?.onConfirm || alertDialog?.secondaryAction ? (
              <>
                <AlertDialogCancel onClick={() => {
                  if (alertDialog.onCancel) alertDialog.onCancel();
                }}>
                  {alertDialog.cancelLabel || '取消 / CANCEL'}
                </AlertDialogCancel>
                
                {alertDialog.secondaryAction && (
                   <AlertDialogAction 
                     className={alertDialog.secondaryAction.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
                     onClick={async () => {
                        { const clickFn = alertDialog.secondaryAction!.onClick; setAlertDialog(null); if (clickFn) clickFn(); }
                        // Usually secondary action handles its own closing if needed, but we close by default
                        setAlertDialog(null);
                     }}
                   >
                     {alertDialog.secondaryAction.label}
                   </AlertDialogAction>
                )}

                {alertDialog.onConfirm && (
                   <AlertDialogAction 
                     className={alertDialog.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
                     onClick={async () => {
                       if (alertDialog.onConfirm) {
                         { const confirmFn = alertDialog.onConfirm; setAlertDialog(null); if (confirmFn) confirmFn(); }
                       }
                       setAlertDialog(null);
                     }}
                   >
                     {alertDialog.confirmLabel || '确定 / OK'}
                   </AlertDialogAction>
                )}
              </>
            ) : (
              <AlertDialogAction onClick={() => setAlertDialog(null)}>
                {alertDialog?.confirmLabel || '确定 / OK'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PromptDialog dialog={promptDialog} onClose={() => setPromptDialog(null)} />
    </>
  );
};
