import { generateId } from '@/lib/id';
import { Photo } from '@/types';
import { processImageFile } from '@/services/storage/imageProcessor';
import { savePhotoToCloud } from '@/features/upload/services/uploadService';
import { createTask } from '@/lib/task-queue/taskFactory';
import { runBatchAnalysis } from '@/features/ai/orchestration';
import { appQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';

export const executeBatchUpload = (
  files: File[],
  userId: string = '',
  options: { groupId?: string } = {}
) => async (signal: AbortSignal, onProgress: (progress: number, message?: string) => void) => {
  const results = [];
  const total = files.length;
  
  const uploadedPhotos: Photo[] = [];
  
  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (signal.aborted) throw new Error('Upload aborted');
    
    onProgress(i / total, `處理第 ${i + 1}/${total} 張...`);
    
    // 1. Process
    const processed = await processImageFile(file);
    
    // 2. Upload to Cloud
    const tempPhoto: Photo = {
      id: `temp-${generateId()}`,
      name: { zh: processed.file.name.split('.')[0] },
      uri: processed.dataUrl, // objectUrl for preview
      image_url: '', // LEAVE THIS EMPTY SO uploadSinglePhoto UPLOADS TO R2
      image_hash: processed.hash,
      group_id: options.groupId || null,
      item_code: '', // Placeholder
      category_id: null,
      manufacturer_id: null,
      categoryName: '',
      manufacturerName: '',
      description: null,
      size: processed.file.size,
      width: processed.width,
      height: processed.height,
      is_pinned: false,
      is_hidden: false,
      created_at: new Date().toISOString(),
      _fileName: file.name,
      _fileSize: file.size,
      _lastModified: file.lastModified
    };
    
    const result = await savePhotoToCloud(userId, tempPhoto, processed.file, (statusMsg) => {
      onProgress((i + 0.5) / total, `上傳中: ${statusMsg}`);
    });
    results.push(result);
    
    // Release objectUrl after successful upload
    URL.revokeObjectURL(processed.dataUrl);
    
    uploadedPhotos.push({
        ...tempPhoto,
        id: result.id
    });
    
    onProgress((i + 1) / total, `完成 ${i + 1}/${total}`);
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

