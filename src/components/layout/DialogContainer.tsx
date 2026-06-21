import React from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';
import { useFilters } from '@/hooks';

export function DialogContainer() {
  const { modal, setModal } = useFilters();
  const isOpen = modal === 'edit';
  const close = () => setModal(null);

  return (
    <>
      <NativeDialog 
        id="photo-edit" 
        open={isOpen} 
        onClose={close}
      >
        <PhotoEditDialog onClose={close} />
      </NativeDialog>
    </>
  );
}
