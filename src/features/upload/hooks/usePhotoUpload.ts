import { useAuth, uiStore } from '@/lib/store';
import { useCallback } from 'react';
import { sha256 } from '@/lib/image/hash';
import { checkHashExists } from '@/lib/api/photos';
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

    // Provide immediate feedback
    const loadingToastId = showToast.loading(`正在准备上传 ${fileArray.length} 张照片...`);

    try {
      const uniqueFiles: File[] = [];
      let skippedCount = 0;

      // Process in small batches to avoid blocking main thread too long, but allow parallel hash + check
      const BATCH_SIZE = 5;
      for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batch = fileArray.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(async (file) => {
          const hash = await sha256(file);
          const exists = await checkHashExists(hash);
          return { file, exists };
        }));

        for (const { file, exists } of results) {
          if (exists) {
            skippedCount++;
          } else {
            uniqueFiles.push(file);
          }
        }
      }

      showToast.dismiss(loadingToastId);

      if (skippedCount > 0) {
        showToast.info(`已自动跳过 ${skippedCount} 张重复照片`);
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
    } catch (error) {
      showToast.dismiss(loadingToastId);
      showToast.error(`准备上传失败: ${error instanceof Error ? error.message : '网络或服务器错误'}`);
      console.error('[uploadFiles] Error during preparation:', error);
    }
  }, [user?.id]);

  return { uploadFiles };
}
