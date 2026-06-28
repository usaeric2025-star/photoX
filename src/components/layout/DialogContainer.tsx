import { useSignal, isLightboxOpen } from '@/lib/store';
import { useUIStore } from '@/store/uiStore';
import { SonnerContainer } from '@/components/ui/SonnerContainer';
import { TaskBadge, TaskDrawer } from '@/lib/task-queue/components';
import { PhotoLightbox } from '@/features/lightbox/PhotoLightbox';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';
import { useEffect, useState } from 'react';

export function DialogContainer() {
  const isLightbox = useSignal(isLightboxOpen);
  const isEditOpen = useUIStore(s => s.isPhotoEditOpen);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <SonnerContainer />
      <TaskBadge />
      <TaskDrawer />
      <PhotoLightbox />
      {isEditOpen && <PhotoEditDialog />}
    </>
  );
}
