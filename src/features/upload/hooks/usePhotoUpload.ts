import { useAuthStore } from '@/store/useAuthStore';
import { useCallback } from 'react';

import { checkDuplicateBatch } from '@/services/photo/duplicateCheck';
import { useInvalidatePhotos } from '@/hooks/photo/useInvalidatePhotos';
import { showToast } from '@/lib/ui/toast';
import { hapticFeedback } from '@/lib/ui/haptics';
import { scheduler } from '@/lib/task-queue';
import { createBatchUploadTask } from '@/lib/task-queue/adapters/upload';

export function usePhotoUpload() {
  const { user } = useAuthStore();

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const { newFiles: uniqueFiles, duplicateHashes } = checkDuplicateBatch(fileArray);

    if (duplicateHashes.length > 0) {
      showToast.info(`已自动合并 ${duplicateHashes.length} 张重复照片`);
    }

    if (uniqueFiles.length === 0) return;

    hapticFeedback.medium();

    const userId = user?.id || 'staff';
    
    // Batch enqueue
    scheduler.enqueue(createBatchUploadTask(uniqueFiles, userId, {}));
    
    showToast.success(`已加入 ${uniqueFiles.length} 张照片到上传队列`);

  }, [user?.id]);

  return { uploadFiles };
}
