import { TaskBadge, TaskDrawer } from '@/lib/task-queue/components';
import { PhotoLightbox } from '@/features/lightbox/PhotoLightbox';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';
import { useEffect, useState } from 'react';

export function DialogContainer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <TaskBadge />
      <TaskDrawer />
      <PhotoLightbox />
      <PhotoEditDialog />
    </>
  );
}
