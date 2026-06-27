import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { AppErrorBoundary } from "@/components/layout/AppErrorBoundary";
import { isPhotoEditOpen, currentEditingPhoto, appLang as appLangSignal } from '@/lib/store';
import { useSignal } from '@storve/react';
import { usePhoto } from "@/hooks/photo/usePhoto";
import { PhotoEditSessionProvider, usePhotoEditSessionContext } from "@/hooks/photo";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { DialogHeader } from "./DialogHeader";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { logger } from "@/lib/logger";
import { useAdminMaintenance, useFilters } from "@/hooks";

function PhotoEditDialogInner({ isOpen, handleClose, editPhotoId }: { isOpen: boolean; handleClose: () => void; editPhotoId: string; }) {
  const adminActions = useAdminMaintenance();
  const { data: photo, isPending } = usePhoto(editPhotoId);
  const appLang = useSignal(appLangSignal);

  const [showConfirm, setShowConfirm] = useState(false);
  const { isDirty, commit, discard, isSubmitting } = usePhotoEditSessionContext();
  
  const handleInterceptClose = async () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      handleClose();
    }
  };
  
  const handleDiscard = () => {
    discard();
    setShowConfirm(false);
    handleClose();
  };
  
  const handleSave = async () => {
    await commit();
  };

  return (
    <>
      <Modal
        id="photo-edit-dialog"
        open={isOpen}
        onClose={handleInterceptClose}
        size="screen"
        hidePadding
        showCloseButton={false}
      >
        {isOpen && (
          <div className="flex flex-col h-full bg-surface-soft min-h-[500px]">
            <div className="p-4 border-b flex justify-between items-center bg-surface-base">
              <div></div>
              <DialogHeader onClose={handleInterceptClose} onDeleteClick={async () => {
                logger.info('[PhotoEditDialog] Delete clicked for photo:', editPhotoId);
                await adminActions.deletePhoto.mutateAsync([editPhotoId]);
                handleClose();
              }} />
            </div>
            
            {isPending ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[500px]">
                <LoadingSpinner size="lg" />
                <p className="text-sm font-medium text-slate-500">正在获取照片详情...</p>
              </div>
            ) : (
              <AppErrorBoundary>
                <PhotoEditTabs />
              </AppErrorBoundary>
            )}
          </div>
        )}
      </Modal>
      
      <NativeDialog
        id="dirty-confirm-dialog"
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
      >
        <div className="p-6 flex flex-col gap-4">
          <p className="text-text-main">
            {appLang === 'zh' ? '检测到有未保存的修改。要进行何种操作？' : 'Detected unsaved changes. What would you like to do?'}
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={handleDiscard} className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
              {appLang === 'zh' ? '放弃修改' : 'Discard changes'}
            </button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90">
              {appLang === 'zh' ? '保存并关闭' : 'Save and close'}
            </button>
          </div>
        </div>
      </NativeDialog>
    </>
  );
}

export function PhotoEditDialog() {
  const isOpen = useSignal(isPhotoEditOpen);
  const photo = useSignal(currentEditingPhoto);
  const { setModal, setPhotoId } = useFilters();
  
  if (!isOpen || !photo?.id) return null;

  const handleClose = () => {
    isPhotoEditOpen.set(false);
  };

  return (
    <PhotoEditSessionProvider photoId={photo.id} onSuccess={handleClose}>
      <PhotoEditDialogInner 
        isOpen={isOpen}
        handleClose={handleClose}
        editPhotoId={photo.id}
      />
    </PhotoEditSessionProvider>
  );
}
