import { generateId } from '#lib/id.js';
import { Photo } from '#src/types/index.js';
import { processImageFile } from '#src/services/storage/imageProcessor.js';
import { savePhotoToCloud } from '#src/features/upload/services/uploadService.js';
import { createTask } from '#lib/task-queue/taskFactory.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';
import { appQuery } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { checkHashExists } from '#lib/api/photos.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { logger } from '#lib/logger.js';

export const executeBatchUpload = (
  files: File[],
  userId: string = '',
  options: { groupId?: string } = {}
) => async (signal: AbortSignal, onProgress: (progress: number, message?: string) => void) => {
  const results = [];
  const total = files.length;
  const uploadedPhotos: Photo[] = [];
  let skippedCount = 0;
  
  if (total === 0) return [];

  // Helper for parallel map with concurrency limit
  async function parallelMap<T, R>(
    arr: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number
  ): Promise<R[]> {
    const res: R[] = [];
    const queue = arr.map((item, index) => ({ item, index }));
    
    async function worker() {
      while (queue.length && !signal.aborted) {
        const { item, index } = queue.shift()!;
        res[index] = await fn(item, index);
      }
    }
    
    await Promise.all(Array(Math.min(concurrency, arr.length)).fill(null).map(worker));
    return res;
  }

  // === 阶段1 & 2：并行压缩与去重 ===
  onProgress(0.1, `處理壓縮及查重 (0/${total})...`);
  
  type ProcessedTask = { file: File, processed?: any, isDuplicate: boolean, error?: string, originalIndex: number };
  
  const processTasks = await parallelMap(
    files,
    async (file, index): Promise<ProcessedTask> => {
      try {
        const processed = await processImageFile(file);
        const isDuplicate = await checkHashExists(processed.hash);
        
        if (isDuplicate) {
          URL.revokeObjectURL(processed.dataUrl); // clean up
        }
        
        return { file, processed, isDuplicate, originalIndex: index };
      } catch (err) {
        return { file, isDuplicate: false, error: (err as Error).message || '壓縮失敗', originalIndex: index };
      }
    },
    3 // Compress 3 at a time
  );

  if (signal.aborted) throw new Error('Upload aborted');

  const validTasks = processTasks.filter(t => !t.isDuplicate && !t.error);
  skippedCount = processTasks.filter(t => t.isDuplicate).length;
  const failedCompress = processTasks.filter(t => t.error).length;

  if (validTasks.length === 0) {
    if (skippedCount > 0) {
      import('#lib/ui/toast.js').then(({ showToast }) => showToast.info(`已跳過 ${skippedCount} 張重複照片`));
    }
    if (failedCompress > 0) {
      import('#lib/ui/toast.js').then(({ showToast }) => showToast.error(`${failedCompress} 張照片壓縮失敗`));
    }
    return [];
  }

  // === 阶段3：并行上传 ===
  let uploadedCount = 0;
  
  const uploadTasks = await parallelMap(
    validTasks,
    async (task, idx) => {
      try {
        const processed = task.processed!;
        const tempPhoto: Photo = {
          id: `temp-${generateId()}`,
          name: processed.file.name.split('.')[0],
          uri: processed.dataUrl, 
          imageUrl: '', 
          imageHash: processed.hash,
          groupId: options.groupId || null,
          itemCode: '', 
          categoryId: null,
          manufacturerId: null,
          categoryName: '',
          manufacturerName: '',
          description: null,
          width: processed.width,
          height: processed.height,
          isPinned: false,
          isHidden: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _fileName: task.file.name,
          _fileSize: task.file.size,
          _lastModified: task.file.lastModified
        };
        
        // Single retry logic inside
        let attempt = 0;
        let result = null;
        while (attempt < 2) {
          try {
            result = await savePhotoToCloud(userId, tempPhoto, processed.file, () => {});
            break;
          } catch (e) {
            attempt++;
            if (attempt >= 2) throw e;
            await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
          }
        }
        
        URL.revokeObjectURL(processed.dataUrl);
        
        uploadedCount++;
        onProgress(0.3 + (uploadedCount / validTasks.length) * 0.7, `上傳中... (${uploadedCount}/${validTasks.length})`);
        
        return { success: true, result, tempPhoto };
      } catch (err) {
        return { success: false, error: (err as Error).message || '上傳失敗', file: task.file };
      }
    },
    4 // Upload 4 concurrently
  );

  if (signal.aborted) throw new Error('Upload aborted');

  // === 阶段4：结果汇总 ===
  const successUploads = uploadTasks.filter(t => t.success);
  const failedUploads = uploadTasks.filter(t => !t.success);

  successUploads.forEach(t => {
    results.push(t.result);
    uploadedPhotos.push({
      ...t.tempPhoto!,
      id: t.result!.id
    });
  });

  if (skippedCount > 0 || failedUploads.length > 0 || failedCompress > 0) {
    import('#lib/ui/toast.js').then(({ showToast }) => {
      let msg = `成功上傳 ${successUploads.length} 張。`;
      if (skippedCount > 0) msg += ` 跳過重複 ${skippedCount} 張。`;
      if (failedUploads.length > 0) msg += ` 上傳失敗 ${failedUploads.length} 張。`;
      if (failedCompress > 0) msg += ` 處理失敗 ${failedCompress} 張。`;
      if (successUploads.length > 0) {
          showToast.success(msg);
      } else {
          showToast.error(msg);
      }
    });
  } else if (successUploads.length > 0) {
    import('#lib/ui/toast.js').then(({ showToast }) => {
      showToast.success(`成功上傳 ${successUploads.length} 張照片！`);
    });
  }

  // ✅ 自動將 AI 分析任務加入佇列 (如果上傳成功)
  if (uploadedPhotos.length > 0) {
    const taskTitle = options.groupId ? `智能合組分析 (${uploadedPhotos.length}張)` : `批量 AI 分析 (${uploadedPhotos.length}張)`;
    
    createTask({
      label: taskTitle,
      type: 'ai-analyze',
      meta: { photoCount: uploadedPhotos.length, groupId: options.groupId },
      execute: async (aiSignal, aiProgress) => {
          const res = await runBatchAnalysis({
            targetPhotos: uploadedPhotos,
            groupId: options.groupId,
            onProgress: aiProgress
          });
          
          // 觸發重新驗證快取
          appQuery.invalidatePhotos();
          
          if (res.successCount < uploadedPhotos.length) {
            const failedCount = uploadedPhotos.length - res.successCount;
            throw new Error(`${failedCount} 張照片 AI 分析失敗`);
          }
          if (options.groupId && !res.groupSuccess) {
            throw new Error(`商品組 AI 分析失敗`);
          }
          
          import('#lib/ui/toast.js').then(({ showToast }) => {
              showToast.success(options.groupId ? `合組 AI 分析成功！` : `AI 分析完成 (${res.successCount}張)`);
          });
          
          return res;
      },
      onError: (err) => {
          import('#lib/ui/toast.js').then(({ showToast }) => {
              showToast.error(`AI 分析有部分失敗: ${err.message}`);
          });
          // Even on error, invalidate to show partial results
          appQuery.invalidatePhotos();
      }
    });
  }
  
  // Trigger initial photos invalidate immediately after upload
  appQuery.invalidatePhotos();
  
  return results;
};

