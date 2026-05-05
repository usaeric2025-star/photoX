import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X } from 'lucide-react';
import { useAdminUI } from '../../context/AdminContexts';
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
  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog, toast } = useAdminUI();

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
                    {alertDialog.confirmLabel || '確定 / OK'}
                  </AlertDialogAction>
                )}
              </>
            ) : (
              <AlertDialogAction onClick={() => setAlertDialog(null)}>
                確定 / OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-3 border border-slate-700 pointer-events-none"
          >
            {toast.type === 'success' ? <CheckSquare size={18} className="text-green-400" /> : 
             toast.type === 'loading' ? <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" /> : 
             <X size={18} className="text-red-400" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <PromptDialog dialog={promptDialog} onClose={() => setPromptDialog(null)} />
    </>
  );
};
