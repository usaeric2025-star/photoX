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
    execute: async (signal: AbortSignal) => {
      const results = [];
      for (const file of files) {
        if (signal.aborted) throw new Error('Upload aborted');
        
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
        
        const result = await savePhotoToCloud(userId, tempPhoto);
        results.push(result);
      }
      return results;
    },
  };
};
