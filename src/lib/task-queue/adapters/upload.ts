import { Task } from '../types';
import { generateId } from '@/lib/id';
import { Photo } from '@/types';
import { processImageFile } from '@/services/storage/imageProcessor';
import { savePhotoToCloud } from '@/features/upload/services/uploadService';

export const createBatchUploadTask = (
  files: File[],
  userId: string,
  options: { groupId?: string }
): Task => {
  const batchId = generateId();
  return {
    id: `upload-batch-${batchId}`,
    label: `上傳 ${files.length} 張照片`,
    type: 'upload',
    meta: {
      photoCount: files.length,
      groupId: options.groupId,
    },
    state: { status: 'queued' },
    createdAt: Date.now(),
    execute: async (signal: AbortSignal, onProgress: (progress: number, message?: string) => void) => {
      const results = [];
      const total = files.length;
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
          uri: processed.dataUrl,
          image_url: processed.dataUrl,
          image_hash: processed.hash,
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
        
        const result = await savePhotoToCloud(userId, tempPhoto, (statusMsg) => {
          onProgress((i + 0.5) / total, `上傳中: ${statusMsg}`);
        });
        results.push(result);
        
        onProgress((i + 1) / total, `完成 ${i + 1}/${total}`);
      }
      return results;
    },
  };
};
