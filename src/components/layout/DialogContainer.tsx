import React from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';
import { GlobalDiagnosticsDialog } from '@/components/ui/GlobalDiagnosticsDialog';
import { useFilters } from '@/hooks';

export function DialogContainer() {
  const { modal, setModal } = useFilters();
  const isEditOpen = modal === 'edit';
  const isDiagnosticsOpen = modal === 'diagnostics';
  const close = () => setModal(null);

  return (
    <>
      <NativeDialog 
        id="photo-edit" 
        open={isEditOpen} 
        onClose={close}
      >
        <PhotoEditDialog onClose={close} />
      </NativeDialog>

      <GlobalDiagnosticsDialog 
        open={isDiagnosticsOpen} 
        onClose={close} 
      />
    </>
  );
}
