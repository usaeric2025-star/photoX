import { useEffect, useState, lazy, Suspense } from 'react';
import { usePermission } from '#src/hooks/index.js';
import { PhotoLightbox } from '#src/features/lightbox/PhotoLightbox.js';

const TaskDrawer = lazy(() => import('#lib/task-queue/components/index.js').then(m => ({ default: m.TaskDrawer })));
const PhotoEditDialog = lazy(() => import('#src/features/photo-edit/PhotoEditDialog.js').then(m => ({ default: m.PhotoEditDialog })));

export function DialogContainer() {
  const [mounted, setMounted] = useState(false);
  const { can } = usePermission();
  const canAccessAdminWorkspace = can('admin:dashboard:access');
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <Suspense fallback={null}>
        {canAccessAdminWorkspace && (
          <>
            <TaskDrawer />
            <PhotoEditDialog />
          </>
        )}
      </Suspense>
      <PhotoLightbox />
    </>
  );
}
