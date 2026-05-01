import { useCallback } from 'react';
import { useAdminPhoto } from '../context/AdminContexts';
import { updatePhoto } from '../services/photoService';
import { Photo } from '../types';

export function usePhotoUpdate() {
  const { setPhotos } = useAdminPhoto();

  const updatePhotoHook = useCallback(async (photoId: string, updates: Partial<Photo>) => {
    return updatePhoto(photoId, updates, setPhotos);
  }, [setPhotos]);

  return { updatePhoto: updatePhotoHook };
}
