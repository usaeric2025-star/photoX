import React, { useState } from "react";
import { Modal } from "#src/components/ui/Modal.js";
import { AppErrorBoundary } from "#src/components/layout/AppErrorBoundary.js";
import { usePhoto } from "#src/hooks/photo/index.js";
import { PhotoEditSessionProvider, usePhotoEditSessionContext } from "./hooks/PhotoEditSession.js";
import { PhotoEditTabs } from "./PhotoEditTabs.js";
import { DialogHeader } from "./DialogHeader.js";
import { LoadingSpinner } from "#src/components/ui/feedback/LoadingSpinner.js";
import { logger } from "#lib/logger.js";
import { useAdminActions, useFilters, useTranslation } from '#src/hooks/index.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { StandardModalLayout } from "#src/components/ui/StandardModalLayout.js";

function PhotoEditDialogInner({ isOpen, handleClose, editPhotoId }: { isOpen: boolean; handleClose: () => void; editPhotoId: string; }) {
  const { t } = useTranslation();
  const adminActions = useAdminActions();
  const { data: photo, isPending, isError } = usePhoto(editPhotoId);

  const [showConfirm, setShowConfirm] = useState(false);
  const { isDirty, commit, discard, isSubmitting, form } = usePhotoEditSessionContext();
  const isSaving = isSubmitting;
  
  const handleInterceptClose = async () => {
    if (isDirty && !isSaving) {
      setShowConfirm(true);
    } else {
      handleClose();
    }
  };
  
  const handleDiscard = () => {
    discard();
    setShowConfirm(false);
    showToast.success(t('cancel') || '已放弃修改');
    handleClose();
  };
  
  const handleSave = async () => {
    try {
        await commit();
        handleClose();
    } catch (e) {
        ErrorFactory.handle(e, { context: t('save') });
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
                showToast.success(t('photoDeleted'));
                handleClose();
              } catch (e) {
                ErrorFactory.handle(e, { context: t('deletePhotoAction') });
              }
            }} />}
          >
            {isError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-red-500">
                <p className="text-sm font-medium">{t('updateFailed') || '加载失败'}</p>
                <button onClick={handleClose} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-slate-700">
                  {t('close')}
                </button>
              </div>
            ) : isPending ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
                <LoadingSpinner size="lg" />
                <p className="text-sm font-medium text-slate-500">{t('loading')}...</p>
              </div>
            ) : (
              <AppErrorBoundary>
                <PhotoEditTabs />
              </AppErrorBoundary>
            )}
          </StandardModalLayout>
        )}
      </Modal>
      
      <Modal
        id="dirty-confirm-dialog"
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
      >
        <div className="p-6 flex flex-col gap-4">
          <p className="text-text-main">
            {t('confirmDeleteMsg') /* 检测到有未保存的修改。要进行何种操作？ - 這裡可能需要新增 Key，先沿用語義接近的 */}
          </p>
          <div className="flex gap-2 justify-end">
            <button onClick={handleDiscard} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100">
              {t('cancel')}
            </button>
            <button onClick={handleSave} className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90">
              {t('save')}
            </button>
          </div>
        </div>
      </Modal>
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
