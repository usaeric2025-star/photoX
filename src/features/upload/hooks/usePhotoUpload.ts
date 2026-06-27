import { useAuth, uiStore } from '@/lib/store';
import { useCallback } from 'react';

import { checkDuplicateBatch } from '@/services/photo';
import { showToast } from '@/lib/ui/toast';
import { hapticFeedback } from '@/lib/ui/haptics';
import { createTask } from '@/lib/task-queue';
import { executeBatchUpload } from '@/lib/task-queue/adapters/upload';
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

    const userId = user?.id;
    
    // Check if we should group them
    const isGroup = uiStore.getState().uploadAsGroup && uniqueFiles.length > 1;
    const groupId = isGroup ? generateId() : undefined;
    
    // Batch enqueue via TaskFactory
    createTask({
      label: `上傳 ${uniqueFiles.length} 張照片`,
      type: 'upload',
      userId,
      meta: {
        photoCount: uniqueFiles.length,
        groupId: groupId,
      },
      execute: executeBatchUpload(uniqueFiles, userId, { groupId }),
      onComplete: (result) => {
        showToast.success(`上傳完成，共 ${result.length} 張`);
      }
    });
    
  }, [user?.id]);

  return { uploadFiles };
}
