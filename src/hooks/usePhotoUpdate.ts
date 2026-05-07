import { useCallback } from 'react';
import { useAdminPhoto } from '../context/AdminContexts';
import { updatePhoto } from '../services/photoMutationService';
import { Photo } from '../types';

export function usePhotoUpdate() {
  const { setPhotos } = useAdminPhoto();

  const updatePhotoHook = useCallback(async (photoId: string, updates: Partial<Photo>) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...updates } : p));
    return updatePhoto(photoId, updates);
  }, [setPhotos]);

  return { updatePhoto: updatePhotoHook };
}
