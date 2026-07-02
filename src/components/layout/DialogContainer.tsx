import { TaskBadge, TaskDrawer } from '#lib/task-queue/components/index.js';
import { PhotoLightbox } from '#src/features/lightbox/PhotoLightbox.js';
import { PhotoEditDialog } from '#src/features/photo-edit/PhotoEditDialog.js';
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
