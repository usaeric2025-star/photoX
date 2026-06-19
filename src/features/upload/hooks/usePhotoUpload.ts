import { logger } from '@/lib/logger';
import { useAuthStore } from '@/store/useAuthStore';
import { generateId } from '@/lib/id';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useCallback } from 'react';

import { checkDuplicateBatch } from '@/services/photo/duplicateCheck';
import { useInvalidatePhotos } from '@/hooks';
import { showToast } from '@/lib/ui/toast';
import { Photo } from '@/types';
import { hapticFeedback } from '@/lib/ui/haptics';
import { useUIStore } from '@/store/useUIStore';
import { useUploadProgress } from '@/hooks/core/useUploadProgress';

export function usePhotoUpload() {
  const { startUploadBatch, updateUploadProgress, completeUploadBatch, errorUploadBatch } = useUploadProgress();
  
  const invalidatePhotos = useInvalidatePhotos();
  const { user } = useAuthStore();
  const appLang = useUIStore(s => s.appLang);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const { newFiles: uniqueFiles, duplicateHashes } = checkDuplicateBatch(fileArray);

    if (duplicateHashes.length > 0) {
      showToast.warning(`已跳过 ${duplicateHashes.length} 张本地重复照片`);
    }

    if (uniqueFiles.length === 0) return;

    hapticFeedback.medium();

    const taskId = startUploadBatch(uniqueFiles.length);

    try {
      // Lazy load processing and upload services
      const { processImageFile } = await import('@/services/storage/imageProcessor');
      const { savePhotoToCloud } = await import("@/features/upload/services/uploadService");

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = duplicateHashes.length;
      const uploadedIds: string[] = [];

      for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        
        updateUploadProgress(taskId, i, uniqueFiles.length, file.name);

        try {
          // 1. Process
          const processed = await processImageFile(file);
          
          // 2. Upload to Cloud
          const tempPhoto: Photo = {
            id: `temp-${generateId()}`,
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
            _fileName: file.name,
            _fileSize: file.size,
            _lastModified: file.lastModified
          } as any;

          const uploadResult = await savePhotoToCloud(user?.id || 'staff', tempPhoto);
          if (uploadResult?.id) {
            uploadedIds.push(uploadResult.id);
          }
          
          // Check if it was a server-side duplicate reuse
          if (uploadResult?.is_duplicate) {
              skippedCount++;
          } else {
              successCount++;
          }
        } catch (err: unknown) {
          logger.error(`[Upload] Failed for ${file.name}:`, err);
          // remove from lock
          const { removeFromDuplicateCache } = await import('@/services/photo/duplicateCheck');
          // Note: we can't easily get the hash here if processImageFile failed, but we can pass file
          removeFromDuplicateCache(file);
          
          // 在批量任务中保持静默，由任务中心最后統一呈現狀態
          ErrorFactory.handle(err, `照片上传失败: ${file.name}`, true);
          failureCount++;
          // We don't stop the whole batch for one failure
        }
      }

      if (successCount > 0 || skippedCount > 0) {
        hapticFeedback.success();
        
        // Group uploaded photos if setting is enabled
        const uiStore = useUIStore.getState();
        if (uiStore.uploadAsGroup && uploadedIds.length > 1) {
           try {
             // Let's create a new group or use group mutation
             const { groupPhotos } = await import('@/services/group/commands');
             await groupPhotos(uploadedIds, undefined);
             showToast.success('合组成功');
             
             // Then batch edit them
             uiStore.update({ batchEditingIds: uploadedIds });
             const { router } = await import('@/router');
             router.navigate({ to: '/admin/batch-edit' });
           } catch(e) {
             ErrorFactory.handle(e, '合组失败');
           }
        } else if (uploadedIds.length === 1) {
          // If single photo, we might want to open edit modal immediately?
          // The user mentioned "上传后跳出合组编辑，但我是单张上传"
          // So we should make sure we don't go to batch-edit for single photos.
          invalidatePhotos();
        }
        
        // 移除冗余的 toast.success，任务中心会显示结果
        invalidatePhotos();
      }

      if (failureCount > 0) {
        hapticFeedback.error();
        // 移除冗余的 toast.error，任务中心会显示结果
      }

      completeUploadBatch(taskId, successCount, skippedCount, failureCount, uniqueFiles.length);

    } catch (err: unknown) {
      hapticFeedback.error();
      ErrorFactory.handle(err, '批量上传异常中止');
      errorUploadBatch(taskId);
    }
  }, [startUploadBatch, updateUploadProgress, completeUploadBatch, errorUploadBatch, invalidatePhotos, user?.id]);

  return { uploadFiles };
}
