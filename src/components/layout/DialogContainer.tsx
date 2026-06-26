import { createPortal } from 'react-dom';
import { useSignal, isLightboxOpen, isTaskDrawerOpen, isDiagnosticsOpen } from '@/lib/store';
import { SonnerContainer } from '@/components/ui/SonnerContainer';
import { TaskBadge, TaskDrawer } from '@/lib/task-queue/components';
import { PhotoLightbox } from '@/features/lightbox/PhotoLightbox';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';
import { useEffect, useState, lazy, Suspense } from 'react';

const DiagDialog = lazy(() => import('@/components/ui/DiagDialog').then(m => ({ default: m.DiagDialog })));

export function DialogContainer() {
  const isLightbox = useSignal(isLightboxOpen);
  const isDiag = useSignal(isDiagnosticsOpen);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <SonnerContainer />
      <TaskBadge />
      <TaskDrawer />
      {isLightbox && <PhotoLightbox />}
      <PhotoEditDialog />
      {isDiag && (
        <Suspense fallback={null}>
          <DiagDialog open={isDiag} onClose={() => isDiagnosticsOpen.set(false)} />
        </Suspense>
      )}
    </>,
    document.body
  );
}
