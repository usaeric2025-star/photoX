import { Photo } from '#src/types/index.js';
import { 
  computeFileHash, 
  processUpload, 
  UploadTask, 
  UploadResult 
} from '#src/lib/upload/index.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { logger } from '#lib/logger.js';
import { api } from '#lib/api.js';

export const executeBatchUpload = (
  files: File[],
  userId: string = '',
  options: { groupId?: string } = {}
) => async (signal: AbortSignal, onProgress: (progress: number, message?: string) => void) => {
  const results: any[] = [];
  const total = files.length;
  
  if (total === 0) return [];

  // 1. Pre-create Group if needed
  if (options.groupId) {
    onProgress(0.05, '正在準備商品組...');
    try {
      await api.groups.upsert.$post({
        json: {
          id: options.groupId,
          name: 'GROUP',
          status: 'confirmed',
          userId: userId || '8ec53131-a589-4b50-beb4-6b5308541e1b'
        }
      });
    } catch (err) {
      logger.error('Failed to pre-create group', err);
    }
  }

  // Concurrency helper
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

  // 2. Stage 1: Hash Calculation (Parallel)
  onProgress(0.1, `計算哈希 (${0}/${total})...`);
  let hashedCount = 0;
  const tasks: UploadTask[] = await parallelMap(
    files,
    async (file) => {
      const hash = await computeFileHash(file);
      hashedCount++;
      onProgress(0.1 + (hashedCount / total) * 0.1, `計算哈希 (${hashedCount}/${total})...`);
      return { file, hash, groupId: options.groupId };
    },
    4
  );

  if (signal.aborted) throw new Error('Upload aborted');

  // 3. Stage 2: Upload Coordination (Sequential Processing for better stability or limited parallel)
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Initial progress for stage 2
  onProgress(0.2, `正在準備上傳 (0/${total})...`);

  const uploadResults = await parallelMap(
    tasks,
    async (task) => {
      try {
        const currentBatchIndex = processedCount + 1;
        const baseMsg = `(${currentBatchIndex}/${total})`;
        
        const result = await processUpload(task, (status) => {
          onProgress(0.2 + (processedCount / total) * 0.8, `${status} ${baseMsg}`);
        });

        processedCount++;
        
        if (result.duplicate) skippedCount++;
        else if (!result.success) failedCount++;
        
        // Final update for this item
        onProgress(0.2 + (processedCount / total) * 0.8, `上傳中 (${processedCount}/${total})...`);
        return { ...result, name: task.file.name };
      } catch (err) {
        processedCount++;
        failedCount++;
        logger.error('[TaskQueue] Upload processing error:', err);
        return { success: false, error: String(err), name: task.file.name } as any;
      }
    },
    2 // Upload 2 at a time to avoid heavy concurrent processing/compression
  );

  // 4. Summarize Results
  const successes = uploadResults.filter(r => r.success && !r.duplicate);
  
  import('#lib/ui/toast.js').then(({ showToast }) => {
    if (successes.length > 0) {
      let msg = `成功上傳 ${successes.length} 張。`;
      if (skippedCount > 0) msg += ` 跳過重複 ${skippedCount} 張。`;
      if (failedCount > 0) msg += ` 失敗 ${failedCount} 張。`;
      showToast.success(msg);
    } else if (skippedCount > 0) {
      showToast.info(`已跳過 ${skippedCount} 張重複照片。`);
    } else if (failedCount > 0) {
      showToast.error(`上傳失敗 ${failedCount} 張。`);
    }
  });

  // Final invalidate
  queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  
  return uploadResults;
};
