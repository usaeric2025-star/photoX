import { generateId } from '#lib/id.js';
import { Photo } from '#src/types/index.js';
import { processImageFile, ProcessedImage } from '#src/services/storage/imageProcessor.js';
import { savePhotoToCloud } from '#src/features/upload/services/uploadService.js';
import { createTask } from '#lib/task-queue/taskFactory.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { checkHashExists } from '#lib/api/photos.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { logger } from '#lib/logger.js';
import { api } from '#lib/api.js';

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

  // === Pre-create the group if we are grouping ===
  if (options.groupId) {
    onProgress(0.05, '正在創建商品組...');
    try {
      const res = await api.groups.upsert.$post({
        json: {
          id: options.groupId,
          name: 'GROUP',
          status: 'confirmed',
          userId: userId || '8ec53131-a589-4b50-beb4-6b5308541e1b'
        }
      });
      if (!res.ok) {
        throw new Error('創建商品組失敗');
      }
    } catch (err) {
      logger.error('Failed to pre-create group during upload', err);
      throw ErrorFactory.wrap(err instanceof Error ? err : new Error(String(err)), 'executeBatchUpload.preCreateGroup');
    }
  }

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
  
  type ProcessedTask = { file: File, processed?: ProcessedImage, isDuplicate: boolean, error?: string, originalIndex: number };
  
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

  // Trigger initial photos invalidate immediately after upload
  queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  
  return results;
};

