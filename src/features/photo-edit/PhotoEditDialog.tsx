import React from "react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { useUIStore } from "@/store";
import { 
  usePhoto,
  useFilters,
} from "@/hooks";
import { useConfirm } from "@/context/ConfirmContext";
import { PhotoEditSessionProvider } from "@/hooks/photo/PhotoEditSessionProvider";
import { usePhotoEditSessionContext } from "@/hooks/photo/usePhotoEditSessionContext";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { DialogHeader } from "./DialogHeader";

function PhotoEditDialogInner({ isOpen, handleClose, editPhotoId }: { isOpen: boolean; handleClose: () => void; editPhotoId: string; }) {
  const { data: photo, isPending } = usePhoto(editPhotoId);
  const appLang = useUIStore((s) => s.appLang);
  const confirm = useConfirm();
  const { isDirty } = usePhotoEditSessionContext();

  const handleInterceptClose = async () => {
    if (isDirty) {
      const confirmed = await confirm({
        title: appLang === 'zh' ? '放弃修改？' : 'Discard changes?',
        description: appLang === 'zh' ? '您有未保存的修改，关闭将丢失这些修改。' : 'You have unsaved changes. Closing will discard them.',
        variant: 'destructive',
        confirmText: appLang === 'zh' ? '放弃修改' : 'Discard'
      });
      if (confirmed) {
        handleClose();
      }
    } else {
      handleClose();
    }
  };

  if (isPending) {
    return (
      <NativeDialog 
        open={isOpen} 
        onClose={handleClose} 
        size="5xl" 
        hidePadding
        showCloseButton={false}
        className="max-h-[90vh] overflow-hidden flex flex-col p-0"
      >
        <div className="p-20 flex flex-col items-center justify-center gap-4 min-h-[500px]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">正在获取照片详情...</p>
        </div>
      </NativeDialog>
    );
  }

  return (
    <NativeDialog 
      open={isOpen} 
      onClose={handleInterceptClose} 
      size="5xl" 
      hidePadding
      showCloseButton={false}
      className="max-h-[90vh] overflow-hidden flex flex-col p-0"
    >
      <div className="flex flex-col h-full bg-surface-soft min-h-[500px]">
        <DialogHeader onClose={handleInterceptClose} onDeleteClick={() => {}} />
        <PhotoEditTabs editPhotoId={editPhotoId} appLang={appLang} />
      </div>
    </NativeDialog>
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

