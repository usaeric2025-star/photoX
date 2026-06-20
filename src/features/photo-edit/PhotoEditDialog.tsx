import React from "react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { useUIStore } from "@/store";
import { 
  usePhoto,
  usePhotoEditMutation,
  useFilters,
} from "@/hooks";
import { AutoForm } from '@/components/form/AutoForm';
import { PhotoEditSchema } from '@/schemas/photo';
import { Photo } from '@/types';

function PhotoEditDialogContent({ editPhotoId, handleClose }: { editPhotoId: string; handleClose: () => void }) {
  const { data: photo, isPending } = usePhoto(editPhotoId);
  const updateMutation = usePhotoEditMutation();

  if (isPending) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">正在获取照片详情...</p>
      </div>
    );
  }

  const defaultValues = photo ? {
    name: typeof photo.name === 'string' ? photo.name : (photo.name?.zh || ''),
    description: typeof photo.description === 'string' ? photo.description : (photo.description?.zh || ''),
    category_id: photo.category_id,
    manufacturer_id: photo.manufacturer_id,
    price: photo.price,
    note: photo.note,
    manual_code: photo.manual_code,
    model_number: photo.model_number,
    is_hidden: photo.is_hidden
  } : {};

  return (
    <div className="p-2">
      <AutoForm
        schema={PhotoEditSchema}
        defaultValues={defaultValues}
        className="space-y-6"
        onSubmit={async (data) => {
          if (editPhotoId) {
            await updateMutation.mutateAsync({ id: editPhotoId, updates: data as unknown as Partial<Photo> });
            handleClose();
          }
        }}
      />
    </div>
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
      className="max-h-[90vh]"
    >
      <PhotoEditDialogContent 
        editPhotoId={editPhotoId || ''}
        handleClose={handleClose}
      />
    </NativeDialog>
  );
}
