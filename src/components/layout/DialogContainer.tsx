import React, { lazy, Suspense } from 'react';
import { NativeDialog } from '@/components/ui/NativeDialog';
const PhotoEditDialog = lazy(() => import('@/features/photo-edit/PhotoEditDialog').then(m => ({ default: m.PhotoEditDialog })));
const DiagnosticsDialog = lazy(() => import('@/components/ui/DiagnosticsDialog').then(m => ({ default: m.DiagnosticsDialog })));
import { useFilters } from '@/hooks';

export function DialogContainer() {
  const { modal, setModal } = useFilters();
  const isEditOpen = modal === 'edit';
  const isDiagnosticsOpen = modal === 'diagnostics';
  const close = () => setModal(null);

  return (
    <Suspense fallback={null}>
      <NativeDialog 
        id="photo-edit" 
        open={isEditOpen} 
        onClose={close}
      >
        <PhotoEditDialog onClose={close} />
      </NativeDialog>

      <DiagnosticsDialog 
        open={isDiagnosticsOpen} 
        onClose={close} 
      />
    </Suspense>
  );
}
