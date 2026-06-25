import { createPortal } from 'react-dom';
import { useSignal, isLightboxOpen, isTaskDrawerOpen, isDiagnosticsOpen } from '@/lib/store';
import { SonnerContainer } from '@/components/ui/SonnerContainer';
import { TaskBadge, TaskDrawer } from '@/lib/task-queue/components';
import { PhotoLightbox } from '@/features/lightbox/PhotoLightbox';
import { DiagDialog } from '@/components/ui/DiagDialog';
import { useEffect, useState } from 'react';

export function DialogContainer() {
  const isLightbox = useSignal(isLightboxOpen);
  const isTaskDrawer = useSignal(isTaskDrawerOpen);
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
      {isTaskDrawer && <TaskDrawer />}
      {isLightbox && <PhotoLightbox />}
      {isDiag && <DiagDialog open={isDiag} onClose={() => isDiagnosticsOpen.set(false)} />}
    </>,
    document.body
  );
}
