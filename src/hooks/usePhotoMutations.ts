import { Photo, User } from '../types';
import { formatDate } from '../utils/dateFormat';
import { saveData } from '../utils/indexedDB';
import { toast } from 'sonner';

export const usePhotoMutations = (
  user: User | null,
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>,
  handleError: (error: any, context?: string) => void,
  deletePhotos: (ids: string | string[], onProgress?: any, signal?: AbortSignal) => Promise<{ success: boolean; error?: any }>,
  photosRef: React.MutableRefObject<Photo[]>,
  addTask?: (t: any) => string,
  updateTask?: (id: string, updates: any) => void,
  removeTask?: (id: string) => void
) => {
  const deletePhoto = async (idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    
    if (ids.length > 1 && addTask && updateTask && removeTask) {
      const controller = new AbortController();
      const taskId = addTask({
        name: `删除照片 (${ids.length} 张)`,
        status: 'running',
        onCancel: () => {
          controller.abort();
          updateTask(taskId, { status: 'cancelled', message: '已取消操作' });
        }
      });
      
      const { success, error } = await deletePhotos(ids, (current: number, total: number) => {
        updateTask(taskId, { progress: Math.floor((current / total) * 100), message: `正在删除 ${current} / ${total}` });
      }, controller.signal);
      
      if (!success) {
        if (controller.signal.aborted) {
           toast.info('删除已中止 / Aborted');
        } else {
           updateTask(taskId, { status: 'error', message: `删除失败: ${error?.message || '未知错误'}` });
           handleError(error, '批量删除失败');
        }
      } else {
        updateTask(taskId, { status: 'completed', progress: 100, message: '删除成功' });
        toast.success('照片已成功删除');
        setTimeout(() => removeTask(taskId), 5000);
      }
    } else {
      const { success, error } = await deletePhotos(idOrIds);
      if (!success) {
        handleError(error, '删除照片失败');
      } else {
        toast.success('照片已成功删除');
      }
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
          toast.success('已完成批量更新');
          setTimeout(() => removeTask(taskId), 5000);
        } catch (e: any) {
          if (controller.signal.aborted) {
             toast.info('操作已中止 / Aborted');
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
