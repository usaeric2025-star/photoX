import { createPortal } from 'react-dom';
import { useSignal, isLightboxOpen, isDiagnosticsOpen } from '@/lib/store';
import { SonnerContainer } from '@/components/ui/SonnerContainer';
import { TaskBadge, TaskDrawer } from '@/lib/task-queue/components';
import { PhotoLightbox } from '@/features/lightbox/PhotoLightbox';
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
      {isDiag && (
        <Suspense fallback={null}>
          <DiagDialog open={isDiag} onClose={() => isDiagnosticsOpen.set(false)} />
        </Suspense>
      )}
    </>,
    document.body
  );
}
