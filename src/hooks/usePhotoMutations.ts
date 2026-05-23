import { useCallback } from 'react';
import { Photo, User } from '../types';
import { formatDate } from '../utils/dateFormat';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useDeletePhotoMutation, 
  useUpdatePhotoMutation, 
  useBatchUpdatePhotosMutation,
  useTaskExecutor,
  useFeedback
} from './';

export const usePhotoMutations = (
  user: User | null,
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const queryClient = useQueryClient();
  const { mutateAsync: deletePhotoMut } = useDeletePhotoMutation();
  const { mutateAsync: updatePhotoMut } = useUpdatePhotoMutation();
  const { mutateAsync: batchUpdateMut } = useBatchUpdatePhotosMutation();
  const { runTask } = useTaskExecutor();
  const { showError } = useFeedback();

  const deletePhoto = useCallback(async (idOrIds: string | string[]) => {
    if (!user) return;
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const targetPhotos = photosRef.current.filter(p => ids.includes(p.id));
    
    await runTask(ids.length > 1 ? `删除 ${ids.length} 张照片` : '删除照片', async ({ updateProgress }) => {
        await deletePhotoMut({ userId: user.id, photos: targetPhotos });
    }, { showSuccessToast: true });
  }, [user, deletePhotoMut, photosRef, runTask]);

  const updatePhotosBulk = useCallback(async (ids: string[], updates: Partial<Photo>, taskName?: string) => {
    if (ids.length === 0 || !user) return;
    
    const updatedAt = formatDate(new Date());
    const finalUpdates = { ...updates, updatedAt };

    await runTask(taskName || `更新 ${ids.length} 张照片`, async ({ updateProgress }) => {
        if (ids.length > 1) {
            await batchUpdateMut({ 
              userId: user.id, 
              ids, 
              updates: finalUpdates, 
              onProgress: (current, total) => {
                updateProgress(Math.floor((current / total) * 100), `正在处理 ${current} / ${total}`);
              }
            });
        } else {
            for (const id of ids) {
                await updatePhotoMut({ id, updates: finalUpdates });
            }
        }
    }, { showSuccessToast: true });
  }, [user, batchUpdateMut, updatePhotoMut, runTask]);

  const updatePhoto = useCallback((id: string, updates: Partial<Photo>) => {
    return updatePhotosBulk([id], updates);
  }, [updatePhotosBulk]);

  return { deletePhoto, updatePhoto, updatePhotosBulk };
};
