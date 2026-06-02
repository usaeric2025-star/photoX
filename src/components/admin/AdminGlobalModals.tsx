import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckSquare, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { PromptDialog } from "./PromptDialog";
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

export function AdminGlobalModals() {
  const alertDialog = useUIStore((s) => s.alertDialog);
  const update = useUIStore((s) => s.update);
  const promptDialog = useUIStore((s) => s.promptDialog);

  return (
    <>
      <AlertDialog
        open={!!alertDialog}
        onOpenChange={(open) => {
          if (!open) {
            if (alertDialog?.onCancel) alertDialog.onCancel();
            update({ alertDialog: null });
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
                <AlertDialogCancel
                  onClick={() => {
                    if (alertDialog.onCancel) alertDialog.onCancel();
                  }}
                >
                  {alertDialog.cancelLabel || "取消 / CANCEL"}
                </AlertDialogCancel>

                {alertDialog.secondaryAction && (
                  <AlertDialogAction
                    className={
                      alertDialog.secondaryAction.type === "danger"
                        ? "bg-red-600 hover:bg-red-700"
                        : ""
                    }
                    onClick={async () => {
                      {
                        const clickFn = alertDialog.secondaryAction!.onClick;
                        update({ alertDialog: null });
                        if (clickFn) clickFn();
                      }
                      // Usually secondary action handles its own closing if needed, but we close by default
                      update({ alertDialog: null });
                    }}
                  >
                    {alertDialog.secondaryAction.label}
                  </AlertDialogAction>
                )}

                {alertDialog.onConfirm && (
                  <AlertDialogAction
                    className={
                      alertDialog.type === "danger"
                        ? "bg-red-600 hover:bg-red-700"
                        : ""
                    }
                    onClick={async () => {
                      if (alertDialog.onConfirm) {
                        {
                          const confirmFn = alertDialog.onConfirm;
                          update({ alertDialog: null });
                          if (confirmFn) confirmFn();
                        }
                      }
                      update({ alertDialog: null });
                    }}
                  >
                    {alertDialog.confirmLabel || "确定 / OK"}
                  </AlertDialogAction>
                )}
              </>
            ) : (
              <AlertDialogAction onClick={() => update({ alertDialog: null })}>
                {alertDialog?.confirmLabel || "确定 / OK"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PromptDialog
        dialog={promptDialog}
        onClose={() => update({ promptDialog: null })}
      />
    </>
  );
}
