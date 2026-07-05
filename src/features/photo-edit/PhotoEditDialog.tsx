import React, { useState } from "react";
import { Modal } from "#src/components/ui/Modal.js";
import { NativeDialog } from "#src/components/ui/NativeDialog.js";
import { AppErrorBoundary } from "#src/components/layout/AppErrorBoundary.js";
import { appLang as appLangSignal, useSignal } from '#lib/store/index.js';
import { usePhoto } from "#src/hooks/photo/usePhoto.js";
import { PhotoEditSessionProvider, usePhotoEditSessionContext } from "#src/hooks/photo/index.js";
import { PhotoEditTabs } from "./PhotoEditTabs.js";
import { DialogHeader } from "./DialogHeader.js";
import { LoadingSpinner } from "#src/components/ui/feedback/LoadingSpinner.js";
import { TaskIndicator } from "#src/components/admin/TaskIndicator.js";
import { logger } from "#lib/logger.js";
import { useAdminMaintenance, useFilters } from '#src/hooks/index.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { StandardModalLayout } from "#src/components/ui/StandardModalLayout.js";

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
    showToast.success(appLang === 'zh' ? '已放弃修改' : 'Changes discarded');
    handleClose();
  };
  
  const handleSave = async () => {
    try {
        await commit();
        showToast.success(appLang === 'zh' ? '保存成功' : 'Saved successfully');
        handleClose();
    } catch (e) {
        ErrorFactory.handle(e, { context: '保存' });
    }
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
          <StandardModalLayout 
            onClose={handleInterceptClose}
            className="bg-surface-soft"
            header={<DialogHeader onClose={handleInterceptClose} onDeleteClick={async () => {
              logger.info('[PhotoEditDialog] Delete clicked for photo:', editPhotoId);
              try {
                await adminActions.deletePhoto.mutateAsync([editPhotoId]);
                showToast.success(appLang === 'zh' ? '删除成功' : 'Deleted successfully');
                handleClose();
              } catch (e) {
                ErrorFactory.handle(e, { context: '删除照片' });
              }
            }} />}
          >
            {isPending ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
                <LoadingSpinner size="lg" />
                <p className="text-sm font-medium text-slate-500">正在获取照片详情...</p>
              </div>
            ) : (
              <AppErrorBoundary>
                <PhotoEditTabs />
              </AppErrorBoundary>
            )}
            <TaskIndicator />
          </StandardModalLayout>
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
  const { modal, photoId, setModal } = useFilters();
  
  const isOpen = modal === 'edit' && !!photoId;
  const activePhotoId = photoId;
  
  if (!isOpen || !activePhotoId) return null;

  const handleClose = () => {
    setModal(null);
  };

  return (
    <PhotoEditSessionProvider photoId={activePhotoId} onSuccess={handleClose}>
      <PhotoEditDialogInner 
        isOpen={isOpen}
        handleClose={handleClose}
        editPhotoId={activePhotoId}
      />
    </PhotoEditSessionProvider>
  );
}
