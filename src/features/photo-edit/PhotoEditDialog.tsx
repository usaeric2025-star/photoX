import React, { useState } from "react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { useUIStore } from "@/store";
import { useFormContext } from "el-form-react-hooks";
import { 
  usePhoto,
  useFilters,
} from "@/hooks";
import { PhotoEditSessionProvider } from "@/hooks/photo/PhotoEditSession";
import { usePhotoEditSessionContext } from "@/hooks/photo/usePhotoEditSessionContext";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { DialogHeader } from "./DialogHeader";
import { LoadingSpinner } from "@/components/ui/feedback/LoadingSpinner";

function PhotoEditDialogInner({ isOpen, handleClose, editPhotoId }: { isOpen: boolean; handleClose: () => void; editPhotoId: string; }) {
  const { data: photo, isPending } = usePhoto(editPhotoId);
  const appLang = useUIStore((s) => s.appLang);
  const { form } = useFormContext();

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

  if (isPending) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4 min-h-[500px]">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-slate-500">正在获取照片详情...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-surface-soft min-h-[500px]">
        <DialogHeader onClose={handleInterceptClose} onDeleteClick={() => {}} />
        <PhotoEditTabs />
      </div>

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
  const urlEditPhotoId = modal === 'edit' ? photoId : null;

  const editPhotoId = propEditPhotoId !== undefined ? propEditPhotoId : urlEditPhotoId;
  const isOpen = propIsOpen !== undefined ? propIsOpen : !!editPhotoId;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      if (modal === 'edit') {
        setModal(null);
      }
    }
  };

  if (!isOpen || !editPhotoId) return null;

  return (
    <PhotoEditSessionProvider photoId={editPhotoId} onSuccess={handleClose}>
      <PhotoEditDialogInner 
        isOpen={isOpen}
        handleClose={handleClose}
        editPhotoId={editPhotoId}
      />
    </PhotoEditSessionProvider>
  );
}

