import { useAuth, uploadAsGroup } from '#lib/store/index.js';
import { useCallback } from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { showToast } from '#lib/ui/toast.js';
import { hapticFeedback } from '#lib/ui/haptics.js';
import { createTask } from '#lib/task-queue/index.js';
import { executeBatchUpload } from '#lib/task-queue/adapters/upload.js';
import { generateId } from '#lib/id.js';
import { logger } from '#lib/logger.js';

export function usePhotoUpload() {
  const { user } = useAuth();

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    try {
      hapticFeedback.medium();

      const userId = user?.id;
      
      // Check if we should group them
      const isGroup = uploadAsGroup.value && fileArray.length > 1;
      const groupId = isGroup ? generateId() : undefined;
      
      // Batch enqueue via TaskFactory (Drawer opens immediately!)
      createTask({
        label: `上傳 ${fileArray.length} 張照片`,
        type: 'upload',
        userId,
        meta: {
          photoCount: fileArray.length,
          groupId: groupId,
        },
        execute: executeBatchUpload(fileArray, userId, { groupId }),
        onError: (err) => {
          ErrorFactory.handle(err, { context: 'usePhotoUpload.uploadFiles' });
        }
      });
    } catch (error) {
      ErrorFactory.handle(error, { context: 'usePhotoUpload.execute' });
    }
  }, [user?.id]);

  return { uploadFiles };
}
