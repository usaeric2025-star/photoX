import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useCallback } from 'react';

import { checkDuplicateBatch } from '@/lib/data/duplicateCheck';
import { useTasks, useInvalidatePhotos, useAuth } from '@/hooks';
import { toast } from 'sonner';
import { Photo } from '@/types';
import { hapticFeedback } from '@/lib/ui/haptics';
import { useUIStore } from '@/store/useUIStore';

export function usePhotoUpload() {
  const { addTask, updateTask } = useTasks();
  
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

    const taskId = addTask({ 
      name: `批量上传 (${uniqueFiles.length}张)`,
      message: '正在初始化队列...'
    });

    try {
      // Lazy load processing and upload services
      const { processImageFile } = await import('@/lib/image/imageProcess');
      const { savePhotoToCloud } = await import("@/services/photo/photoUploadService");

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        const progress = Math.round((i / uniqueFiles.length) * 100);
        
        updateTask(taskId, { 
          progress, 
          message: `正在处理第 ${i + 1}/${uniqueFiles.length} 张: ${file.name}`
        });

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

          await savePhotoToCloud(user?.id || 'staff', tempPhoto);

          successCount++;
        } catch (err: any) {
          console.error(`[Upload] Failed for ${file.name}:`, err);
          // 在批量任务中保持静默，由任务中心最后统一呈现状态
          ErrorFactory.handle(err, `照片上传失败: ${file.name}`, true);
          failureCount++;
          // We don't stop the whole batch for one failure
        }
      }

      if (successCount > 0) {
        hapticFeedback.success();
        // 移除冗余的 toast.success，任务中心会显示结果
        invalidatePhotos();
      }

      if (failureCount > 0) {
        hapticFeedback.error();
        // 移除冗余的 toast.error，任务中心会显示结果
      }

      updateTask(taskId, { 
        status: failureCount === 0 ? 'completed' : failureCount === uniqueFiles.length ? 'error' : 'completed',
        progress: 100, 
        message: failureCount === 0 ? '全部上传成功' : `上传完成: 成功 ${successCount}, 失败 ${failureCount}`
      });

    } catch (err: any) {
      hapticFeedback.error();
      ErrorFactory.handle(err, '批量上传异常中止');
      updateTask(taskId, { 
        status: 'error', 
        message: '上传过程中断'
      });
    }
  }, [addTask, updateTask, invalidatePhotos]);

  return { uploadFiles };
}
