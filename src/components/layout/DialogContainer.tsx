import React from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';
import { useUIStore } from '@/store';

export function DialogContainer() {
  const { isPhotoEditOpen, closePhotoEdit } = useUIStore();

  return (
    <>
      <NativeDialog 
        id="photo-edit" 
        open={isPhotoEditOpen} 
        onClose={closePhotoEdit}
      >
        <PhotoEditDialog onClose={closePhotoEdit} />
      </NativeDialog>
    </>
  );
}
