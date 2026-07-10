import { TaskDrawer } from '#lib/task-queue/components/index.js';
import { PhotoLightbox } from '#src/features/lightbox/PhotoLightbox.js';
import { PhotoEditDialog } from '#src/features/photo-edit/PhotoEditDialog.js';
import { useEffect, useState } from 'react';
import { usePermission } from '#src/hooks/index.js';

export function DialogContainer() {
  const [mounted, setMounted] = useState(false);
  const { can } = usePermission();
  const canAccessStaffWorkspace = can('staff:workspace:access');
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {canAccessStaffWorkspace && (
        <>
          <TaskDrawer />
          <PhotoEditDialog />
        </>
      )}
      <PhotoLightbox />
    </>
  );
}
