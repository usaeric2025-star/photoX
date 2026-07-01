import { generateId } from '@/lib/id';
import { Photo } from '@/types';
import { processImageFile } from '@/services/storage/imageProcessor';
import { savePhotoToCloud } from '@/features/upload/services/uploadService';
import { createTask } from '@/lib/task-queue/taskFactory';
import { runBatchAnalysis } from '@/features/ai/orchestration';
import { appQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';
import { checkHashExists } from '@/lib/api/photos';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { logger } from '@/lib/logger';

export const executeBatchUpload = (
  files: File[],
  userId: string = '',
  options: { groupId?: string } = {}
) => async (signal: AbortSignal, onProgress: (progress: number, message?: string) => void) => {
  const results = [];
  const total = files.length;
  
  const uploadedPhotos: Photo[] = [];
  let skippedCount = 0;
  
  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (signal.aborted) throw new Error('Upload aborted');
    
    try {
        onProgress(i / total, `處理第 ${i + 1}/${total} 張: 正在校驗格式及計算雜湊值...`);
        
        // 1. Process
        const processed = await processImageFile(file);
        
        // 2. Check duplicate
        onProgress((i + 0.2) / total, `處理第 ${i + 1}/${total} 張: 正在比對重複項...`);
        const exists = await checkHashExists(processed.hash);
        if (exists) {
          skippedCount++;
          // Clean up objectUrl
          URL.revokeObjectURL(processed.dataUrl);
          onProgress((i + 1) / total, `處理第 ${i + 1}/${total} 張: 已跳過重複照片 (${processed.file.name})`);
          
          // Let's yield briefly
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        
        // 3. Upload to Cloud
        const tempPhoto: Photo = {
          id: `temp-${generateId()}`,
          name: processed.file.name.split('.')[0],
          uri: processed.dataUrl, // objectUrl for preview
          imageUrl: '', // LEAVE THIS EMPTY SO uploadSinglePhoto UPLOADS TO R2
          imageHash: processed.hash,
          groupId: options.groupId || null,
          itemCode: '', // Placeholder
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
          _fileName: file.name,
          _fileSize: file.size,
          _lastModified: file.lastModified
        };
        
        const result = await savePhotoToCloud(userId, tempPhoto, processed.file, (statusMsg) => {
          onProgress((i + 0.5) / total, `處理第 ${i + 1}/${total} 張: ${statusMsg}`);
        });
        results.push(result);
        
        // Release objectUrl after successful upload
        URL.revokeObjectURL(processed.dataUrl);
        
        uploadedPhotos.push({
            ...tempPhoto,
            id: result.id
        });
        
        onProgress((i + 1) / total, `完成 ${i + 1}/${total}`);
    } catch (err) {
        ErrorFactory.handle(err, { context: `uploadAdapter.uploadFile:${file.name}` });
        throw err;
    }
  }
  
  if (skippedCount > 0) {
    import('@/lib/ui/toast').then(({ showToast }) => {
      showToast.info(`已自動跳過 ${skippedCount} 張重複照片`);
    });
  }
  
  // ✅ 自動將 AI 分析任務加入佇列 (如果上傳成功)
  if (uploadedPhotos.length > 0) {
    const taskTitle = options.groupId ? `智能合组分析 (${uploadedPhotos.length}张)` : `批量 AI 分析 (${uploadedPhotos.length}张)`;
    
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
          appQuery.mutate((key) => Array.isArray(key) && key[0] === queryKeys.photos.all[0]);
          if (options.groupId) {
            appQuery.mutate(queryKeys.groups.detail(options.groupId, true));
            appQuery.mutate((key) => Array.isArray(key) && key[0] === queryKeys.groups.all[0]);
          }
          
          if (res.successCount < uploadedPhotos.length) {
            const failedCount = uploadedPhotos.length - res.successCount;
            throw new Error(`${failedCount} 张照片 AI 分析失败`);
          }
          if (options.groupId && !res.groupSuccess) {
            throw new Error(`商品组 AI 分析失败`);
          }
          
          return res;
      },
      onError: (err) => {
          import('@/lib/ui/toast').then(({ showToast }) => {
              showToast.error(`AI 分析有部分失败: ${err.message}`);
          });
      }
    });
  }
  
  // Trigger initial photos invalidate immediately after upload
  appQuery.mutate((key) => Array.isArray(key) && key[0] === queryKeys.photos.all[0]);
  
  return results;
};

