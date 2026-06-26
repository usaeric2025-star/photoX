import { useAuth, isTaskDrawerOpen, uiStore } from '@/lib/store';
import { useCallback } from 'react';

import { checkDuplicateBatch } from '@/services/photo/duplicateCheck';
import { useInvalidatePhotos } from '@/hooks/photo/useInvalidatePhotos';
import { showToast } from '@/lib/ui/toast';
import { hapticFeedback } from '@/lib/ui/haptics';
import { scheduler } from '@/lib/task-queue';
import { createBatchUploadTask } from '@/lib/task-queue/adapters/upload';
import { generateId } from '@/lib/id';

export function usePhotoUpload() {
  const { user } = useAuth();

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
    
    // Check if we should group them
    const isGroup = uiStore.getState().uploadAsGroup && uniqueFiles.length > 1;
    const groupId = isGroup ? generateId() : undefined;
    
    // Batch enqueue
    scheduler.enqueue(createBatchUploadTask(uniqueFiles, userId, { groupId }));
    
    isTaskDrawerOpen.set(true);
    
    showToast.success(`已加入 ${uniqueFiles.length} 张照片到上传队列`);

  }, [user?.id]);

  return { uploadFiles };
}
