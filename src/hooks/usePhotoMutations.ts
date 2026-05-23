import { useCallback } from 'react';
import { Photo, User, Task } from '../types';
import { formatDate } from '../utils/dateFormat';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useDeletePhotoMutation, 
  useUpdatePhotoMutation, 
  useBatchUpdatePhotosMutation 
} from './';

export const usePhotoMutations = (
  user: User | null,
  showError: (error: unknown, context?: string) => void,
  _deprecated_deletePhotos: unknown, // No longer used as we use hooks
  photosRef: React.MutableRefObject<Photo[]>,
  addTask?: (t: Omit<Task, 'id'>) => string,
  updateTask?: (id: string, updates: Partial<Task>) => void,
  removeTask?: (id: string) => void
) => {
  const queryClient = useQueryClient();
  const { mutateAsync: deletePhotoMut } = useDeletePhotoMutation();
  const { mutateAsync: updatePhotoMut } = useUpdatePhotoMutation();
  const { mutateAsync: batchUpdateMut } = useBatchUpdatePhotosMutation();

  const deletePhoto = useCallback(async (idOrIds: string | string[]) => {
    if (!user) return;
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const targetPhotos = photosRef.current.filter(p => ids.includes(p.id));
    
    if (ids.length > 1 && addTask && updateTask && removeTask) {
      const controller = new AbortController();
      const taskId = addTask({
        name: `删除照片 (${ids.length} 张)`,
        status: 'running',
        progress: 0,
        onCancel: () => {
          controller.abort();
          updateTask(taskId, { status: 'cancelled', message: '已取消操作' });
        }
      });
      
      try {
        await deletePhotoMut({ userId: user.id, photos: targetPhotos });
        updateTask(taskId, { status: 'completed', progress: 100, message: '删除成功' });
        setTimeout(() => removeTask(taskId), 5000);
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : '未知错误';
        updateTask(taskId, { status: 'error', message: `删除失败: ${errMsg}` });
      }
    } else {
      try {
        await deletePhotoMut({ userId: user.id, photos: targetPhotos });
      } catch (e: unknown) {
        showError(e, "删除照片失败");
      }
    }
  }, [user, deletePhotoMut, photosRef, addTask, updateTask, removeTask, showError]);

  const updatePhotosBulk = useCallback(async (ids: string[], updates: Partial<Photo>, taskName?: string) => {
    if (ids.length === 0 || !user) return;
    
    const updatedAt = formatDate(new Date());
    const finalUpdates = { ...updates, updatedAt };

    if (ids.length > 1 && addTask && updateTask && removeTask) {
      const controller = new AbortController();
      const taskId = addTask({
        name: taskName || `批量更新 (${ids.length} 张)`,
        status: 'running',
        onCancel: () => {
           controller.abort();
           updateTask(taskId, { status: 'cancelled', message: '已取消操作' });
        }
      });
      
      try {
        await batchUpdateMut({ 
          userId: user.id, 
          ids, 
          updates: finalUpdates, 
          onProgress: (current, total) => {
            updateTask(taskId, { progress: Math.floor((current / total) * 100), message: `正在处理 ${current} / ${total}` });
          },
          signal: controller.signal
        });
        updateTask(taskId, { status: 'completed', progress: 100, message: '完成' });
        setTimeout(() => removeTask(taskId), 5000);
      } catch (e: unknown) {
        if (!controller.signal.aborted) {
           updateTask(taskId, { status: 'error', message: '部分更新失败' });
           showError(e, "批量云端同步失败");
        }
      }
    } else {
      // Single or small update
      for (const id of ids) {
        try {
          await updatePhotoMut({ id, updates: finalUpdates });
        } catch (e: unknown) {
          // Handled in mutation hook onError
        }
      }
    }
  }, [user, batchUpdateMut, updatePhotoMut, addTask, updateTask, removeTask, showError]);

  const updatePhoto = useCallback((id: string, updates: Partial<Photo>) => {
    return updatePhotosBulk([id], updates);
  }, [updatePhotosBulk]);

  return { deletePhoto, updatePhoto, updatePhotosBulk };
};
