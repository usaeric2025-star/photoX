import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { useUI } from '@/lib/store';
import { usePhoto } from "@/hooks/photo/usePhoto";
import { useFilters } from "@/hooks/useFilters";
import { PhotoEditSessionProvider, usePhotoEditSessionContext } from "@/hooks/photo";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { DialogHeader } from "./DialogHeader";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";
import { logger } from "@/lib/logger";
import { useAdminMaintenance } from "@/hooks";

function PhotoEditDialogInner({ isOpen, handleClose, editPhotoId }: { isOpen: boolean; handleClose: () => void; editPhotoId: string; }) {
  const adminActions = useAdminMaintenance();
  const { data: photo, isPending } = usePhoto(editPhotoId);
  const appLang = useUI((s) => s.appLang);

  React.useEffect(() => {
    logger.debug('PhotoEditDialogInner rendered', { isOpen, editPhotoId, photo: !!photo });
  }, [isOpen, editPhotoId, photo]);

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
            <div className="p-4 border-b flex justify-between items-center bg-red-100">
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
              <PhotoEditTabs />
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


interface PhotoEditDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  editPhotoId?: string | null;
}

export function PhotoEditDialog({ isOpen: propIsOpen, onClose: propOnClose, editPhotoId: propEditPhotoId }: PhotoEditDialogProps) {
  const { modal, photoId, setModal } = useFilters();
  
  // Debug
  React.useEffect(() => {
    logger.info('[PhotoEditDialog] Filters changed:', { modal, photoId, propIsOpen, propEditPhotoId });
  }, [modal, photoId, propIsOpen, propEditPhotoId]);

  const urlEditPhotoId = modal === 'edit' ? photoId : null;

  const editPhotoId = propEditPhotoId !== undefined ? propEditPhotoId : urlEditPhotoId;
  const isOpen = propIsOpen !== undefined ? propIsOpen : (modal === 'edit' && !!editPhotoId);

  const handleClose = () => {
    logger.info('[PhotoEditDialog] Closing...');
    if (propOnClose) {
      propOnClose();
    } else {
      setModal(null);
    }
  };

  return (
    <PhotoEditSessionProvider photoId={editPhotoId || ''} onSuccess={handleClose}>
      <PhotoEditDialogInner 
        isOpen={isOpen}
        handleClose={handleClose}
        editPhotoId={editPhotoId || ''}
      />
    </PhotoEditSessionProvider>
  );
}
