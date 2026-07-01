import { uploadSinglePhoto } from './uploadOrchestrator';
import { Photo } from '#src/types';
import { ErrorFactory } from '#lib/error/ErrorFactory';
import { logger } from '#lib/logger';

export const savePhotoToCloud = async (userId: string = '', photo: Photo, file?: File, onStatus?: (s: string) => void): Promise<{ id: string; is_duplicate?: boolean }> => {
  const result = await uploadSinglePhoto(userId, photo, file, onStatus);
  return result;
};

const savePhotosToCloudBatch = async (
  userId: string = '', 
  photos: { photo: Photo; file?: File }[],
  onProgress?: (count: number) => void
): Promise<Photo[]> => {
  const successPhotos: Photo[] = [];
  let count = 0;
  for (const { photo, file } of photos) {
    try {
      const result = await uploadSinglePhoto(userId || '', photo, file);
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



