import React from "react";
import { Modal } from "@/components/ui/Modal";
import { useUIStore } from "@/store";
import { 
  usePhoto,
  usePhotoEditMutation,
  useFilters,
} from "@/hooks";
import { AutoForm } from '@/components/form/AutoForm';
import { PhotoEditSchema } from '@/schemas/photo';
import { Photo } from '@/types';

function PhotoEditModalContent({ editPhotoId, handleClose }: { editPhotoId: string; handleClose: () => void }) {
  const { data: photo, isPending } = usePhoto(editPhotoId);
  const updateMutation = usePhotoEditMutation();

  if (isPending) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
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
    <div className="flex flex-col h-[85vh] w-full bg-slate-50 focus:outline-none relative p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">Edit Photo Details</h2>
        <button onClick={handleClose} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300">
          ✕
        </button>
      </div>
      <AutoForm
        schema={PhotoEditSchema}
        defaultValues={defaultValues}
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

interface PhotoEditModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  editPhotoId?: string | null;
}

export function PhotoEditModal({ isOpen: propIsOpen, onClose: propOnClose, editPhotoId: propEditPhotoId }: PhotoEditModalProps) {
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
    <Modal open={isOpen} onClose={handleClose} size="lg" hidePadding showCloseButton={false} className="max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
      <PhotoEditModalContent 
        editPhotoId={editPhotoId || ''}
        handleClose={handleClose}
      />
    </Modal>
  );
}
