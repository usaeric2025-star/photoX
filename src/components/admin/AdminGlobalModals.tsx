import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X } from 'lucide-react';
import { useGalleryStore } from '../../store';
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
  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog } = useGalleryStore();

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
            <AlertDialogDescription>
              {alertDialog?.message}
            </AlertDialogDescription>
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
                        await alertDialog.secondaryAction!.onClick();
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
                        await alertDialog.onConfirm();
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
                确定 / OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PromptDialog dialog={promptDialog} onClose={() => setPromptDialog(null)} />
    </>
  );
};
