import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useCallback } from 'react';

import { checkDuplicateBatch } from '@/lib/data/duplicateCheck';
import { useInvalidatePhotos, useAuth } from '@/hooks';
import { toast } from 'sonner';
import { Photo } from '@/types';
import { hapticFeedback } from '@/lib/ui/haptics';
import { useUIStore } from '@/store/useUIStore';
import { useUploadProgress } from '../core/useUploadProgress';

export function usePhotoUpload() {
  const { startUploadBatch, updateUploadProgress, completeUploadBatch, errorUploadBatch } = useUploadProgress();
  
  const invalidatePhotos = useInvalidatePhotos();
  const { user } = useAuth();
  const appLang = useUIStore(s => s.appLang);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const { newFiles: uniqueFiles, duplicateHashes } = checkDuplicateBatch(fileArray);

    if (duplicateHashes.length > 0) {
      toast.warning(`已跳过 ${duplicateHashes.length} 张本地重复照片`);
    }

    if (uniqueFiles.length === 0) return;

    hapticFeedback.medium();

    const taskId = startUploadBatch(uniqueFiles.length);

    try {
      // Lazy load processing and upload services
      const { processImageFile } = await import('@/lib/image/imageProcess');
      const { savePhotoToCloud } = await import("@/services/photo/upload");

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = duplicateHashes.length;

      for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        
        updateUploadProgress(taskId, i, uniqueFiles.length, file.name);

        try {
          // 1. Process
          const processed = await processImageFile(file);
          
          // 2. Upload to Cloud
          const tempPhoto: Photo = {
            id: `temp-${crypto.randomUUID()}`,
            name: processed.file.name.split('.')[0],
            uri: processed.dataUrl,
            image_hash: processed.hash,
            size: processed.file.size,
            mime_type: processed.file.type,
            width: processed.width,
            height: processed.height,
            is_pinned: false,
            is_hidden: false,
            created_at: new Date().toISOString(),
          } as any;

          const uploadResult = await savePhotoToCloud(user?.id || 'staff', tempPhoto);
          
          // Check if it was a server-side duplicate reuse
          if (uploadResult?.is_duplicate) {
              skippedCount++;
          } else {
              successCount++;
          }
        } catch (err: any) {
          console.error(`[Upload] Failed for ${file.name}:`, err);
          // 在批量任务中保持静默，由任务中心最后統一呈現狀態
          ErrorFactory.handle(err, `照片上传失败: ${file.name}`, true);
          failureCount++;
          // We don't stop the whole batch for one failure
        }
      }

      if (successCount > 0 || skippedCount > 0) {
        hapticFeedback.success();
        // 移除冗余的 toast.success，任务中心会显示结果
        invalidatePhotos();
      }

      if (failureCount > 0) {
        hapticFeedback.error();
        // 移除冗余的 toast.error，任务中心会显示结果
      }

      completeUploadBatch(taskId, successCount, skippedCount, failureCount, uniqueFiles.length);

    } catch (err: any) {
      hapticFeedback.error();
      ErrorFactory.handle(err, '批量上传异常中止');
      errorUploadBatch(taskId);
    }
  }, [startUploadBatch, updateUploadProgress, completeUploadBatch, errorUploadBatch, invalidatePhotos, user?.id]);

  return { uploadFiles };
}
