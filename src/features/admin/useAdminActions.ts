import { usePhotoMutations } from '@/hooks/mutations/usePhotoMutations';
import { useFeedback } from '@/hooks/shared/useFeedback';
import type { Photo } from '@/types';

export function useAdminActions() {
  const { deletePhoto, updatePhoto, batchUpdate } = usePhotoMutations();
  const { showError, showSuccess } = useFeedback();

  const handleDeletePhoto = async (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    try {
      await deletePhoto.mutateAsync(idList);
      showSuccess(`已删除 ${idList.length} 张照片`);
    } catch (err) {
      showError(err, '删除失败');
    }
  };

  const handleUpdatePhoto = async (id: string, updates: Partial<Photo>) => {
    try {
      await updatePhoto.mutateAsync({ id, updates });
      showSuccess('更新成功');
    } catch (err) {
      showError(err, '更新失败');
    }
  };

  return {
    deletePhoto: handleDeletePhoto,
    updatePhoto: handleUpdatePhoto,
    batchUpdate,
    onBatchAiAnalyze: async (photos: Photo[]) => { /* implementation */ },
  };
}
