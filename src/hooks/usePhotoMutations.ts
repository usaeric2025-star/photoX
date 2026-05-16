import { Photo, User, Task } from '../types';
import { formatDate } from '../utils/dateFormat';
import { saveData } from '../utils/indexedDB';

export const usePhotoMutations = (
  user: User | null,
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>,
  handleError: (error: unknown, context?: string) => void,
  deletePhotos: (ids: string | string[], onProgress?: (current: number, total: number) => void, signal?: AbortSignal) => Promise<{ success: boolean; error?: Error }>,
  photosRef: React.MutableRefObject<Photo[]>,
  addTask?: (t: Omit<Task, 'id'>) => string,
  updateTask?: (id: string, updates: Partial<Task>) => void,
  removeTask?: (id: string) => void
) => {
  const deletePhoto = async (idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    
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
      
      const result = await deletePhotos(ids, (current: number, total: number) => {
        updateTask(taskId, { progress: Math.floor((current / total) * 100), message: `正在删除 ${current} / ${total}` });
      }, controller.signal);
      
      if (!result.success) {
        updateTask(taskId, { status: 'error', message: `删除失败: ${result.error?.message || '未知错误'}` });
      } else {
        updateTask(taskId, { status: 'completed', progress: 100, message: '删除成功' });
        setTimeout(() => removeTask(taskId), 5000);
      }
    } else {
      await deletePhotos(idOrIds);
    }
  };

  const updatePhotosBulk = async (ids: string[], updates: Partial<Photo>, taskName?: string) => {
    if (ids.length === 0) return;
    
    const updatedAt = formatDate(new Date());
    const finalUpdates = { ...updates, updatedAt };

    // Optimistic UI Update
    setPhotos(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...finalUpdates } : p));
    const nextPhotos = photosRef.current.map(p => ids.includes(p.id) ? { ...p, ...finalUpdates } : p);
    photosRef.current = nextPhotos;
    saveData('product_photos', nextPhotos);

    if (user) {
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
          const { updatePhotosBatch } = await import('../services/photoMutationService');
          await updatePhotosBatch(user.id, ids, finalUpdates, (current, total) => {
            updateTask(taskId, { progress: Math.floor((current / total) * 100), message: `正在处理 ${current} / ${total}` });
          }, controller.signal);
          updateTask(taskId, { status: 'completed', progress: 100, message: '完成' });
          setTimeout(() => removeTask(taskId), 5000);
        } catch (e: any) {
          if (controller.signal.aborted) {
             // Operation aborted by user, no need to toast

          } else {
             updateTask(taskId, { status: 'error', message: '部分更新失败' });
             handleError(e, "批量云端同步失败");
          }
        }
      } else {
        const m = await import('../services/photoMutationService');
        for (const id of ids) {
           await m.updatePhoto(id, finalUpdates).catch(e => handleError(e, "单张照片云端同步失败"));
        }
      }
    }
  };

  const updatePhoto = (id: string, updates: Partial<Photo>) => {
    return updatePhotosBulk([id], updates);
  };

  return { deletePhoto, updatePhoto, updatePhotosBulk };
};
