import { usePhotoEdit, usePhotoDelete, usePhotoBatchEdit, useFeedback } from '@/hooks';
import type { Photo } from '@/types';

export function useAdminActions() {
  const deletePhoto = usePhotoDelete();
  const updatePhoto = usePhotoEdit();
  const batchUpdate = usePhotoBatchEdit();
  const { showError, showSuccess } = useFeedback();

  const handleDeletePhoto = async (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    try {
      await deletePhoto.mutateAsync(idList);
      // Feedback is handled in the hook
    } catch (err) {
      // Error feedback is handled in the hook
    }
  };

  const handleUpdatePhoto = async (id: string, updates: Partial<Photo>) => {
    try {
      await updatePhoto.mutateAsync({ id, updates });
      // Feedback is handled in the hook
    } catch (err) {
      // Error feedback is handled in the hook
    }
  };

  return {
    deletePhoto: handleDeletePhoto,
    updatePhoto: handleUpdatePhoto,
    batchUpdate,
    onBatchAiAnalyze: async (photos: Photo[]) => { /* implementation */ },
  };
}
