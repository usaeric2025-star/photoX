import { uploadSinglePhoto } from './upload/uploadOrchestrator';
import { Photo } from '@/types';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { logger } from '@/lib/logger';

export const savePhotoToCloud = async (userId: string, photo: Photo, onStatus?: (s: string) => void): Promise<{ id: string; is_duplicate?: boolean }> => {
  const result = await uploadSinglePhoto(userId, photo, onStatus);
  return result;
};

export const savePhotosToCloudBatch = async (
  userId: string, 
  photos: Photo[],
  onProgress?: (count: number) => void
): Promise<Photo[]> => {
  const successPhotos: Photo[] = [];
  let count = 0;
  for (const photo of photos) {
    try {
      const result = await uploadSinglePhoto(userId, photo);
      successPhotos.push({ ...photo, id: result.id });
    } catch (e) {
      logger.error('Failed to upload photo in batch', e);
      ErrorFactory.capture(e);
    }
    count++;
    onProgress?.(count);
  }
  return successPhotos;
};



