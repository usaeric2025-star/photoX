import { uploadSinglePhoto } from './upload/uploadOrchestrator';
import { StandardError } from '@/lib/validators/protocol';
import { Photo } from '../../types';
import { extractErrorMessage } from '@/lib/error/errorHandler';

export const savePhotoToCloud = async (userId: string, photo: Photo, onStatus?: (s: string) => void): Promise<string> => {
  const result = await uploadSinglePhoto(userId, photo, onStatus);
  if (!result.ok) {
    throw new StandardError(result.message, { originalError: result.error });
  }
  return result.data;
};

export const savePhotosToCloudBatch = async (
  userId: string, 
  photos: Photo[],
  onProgress?: (count: number) => void
): Promise<Photo[]> => {
  // TODO: Refactor this to use the orchestrator
  return [];
};



