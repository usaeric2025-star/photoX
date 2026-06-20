import React from "react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { useUIStore } from "@/store";
import { 
  usePhoto,
  useFilters,
} from "@/hooks";
import { PhotoEditSessionProvider } from "@/hooks/photo/PhotoEditSessionProvider";
import { PhotoEditTabs } from "./PhotoEditTabs";
import { DialogHeader } from "./DialogHeader";

function PhotoEditDialogContent({ editPhotoId, handleClose }: { editPhotoId: string; handleClose: () => void }) {
  const { data: photo, isPending } = usePhoto(editPhotoId);
  const appLang = useUIStore((s) => s.appLang);

  if (isPending) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">正在获取照片详情...</p>
      </div>
    );
  }

  return (
    <PhotoEditSessionProvider photoId={editPhotoId} onSuccess={handleClose}>
      <div className="flex flex-col h-full bg-surface-soft min-h-[500px]">
        <DialogHeader onClose={handleClose} onDeleteClick={() => {}} />
        <PhotoEditTabs editPhotoId={editPhotoId} appLang={appLang} />
      </div>
    </PhotoEditSessionProvider>
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

  if (!isOpen) return null;

  return (
    <NativeDialog 
      open={isOpen} 
      onClose={handleClose} 
      size="lg" 
      title="编辑照片信息"
      description="修改照片的基本元数据、分类与属性"
      className="max-h-[90vh] overflow-hidden flex flex-col"
    >
      <PhotoEditDialogContent 
        editPhotoId={editPhotoId || ''}
        handleClose={handleClose}
      />
    </NativeDialog>
  );
}
