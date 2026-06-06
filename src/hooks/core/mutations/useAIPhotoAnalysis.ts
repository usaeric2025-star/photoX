import { useCallback } from 'react';
import type { Photo } from '@/types';
import { queryClient } from '@/lib/queryClient';
import { photoKeys } from '@/lib/queryKeys';
import { useErrorHandler, useTasks } from '@/hooks';
import { toast } from 'sonner';
import { isOk } from '@/lib/errorFactory';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export function useAIPhotoAnalysis() {
  const { addTask, updateTask } = useTasks();
  const { handleError } = useErrorHandler();

  const analyzePhoto = useCallback(async (photo: Photo) => {
    if (!photo?.id) return;
    
    const taskId = addTask({
      name: `AI 识别照片: ${photo.name || photo.id}`,
      message: '正在思考中...'
    });

    try {
      updateTask(taskId, { progress: 20, message: '正在解析图像特征...' });
      const { analyzePhoto: runAnalysis } = await import('@/services/aiService');
      const result = await runAnalysis(photo.id);
      
      if (isOk(result)) {
        // [V2.0] If we got a result, we might want to automatically apply it or just notify.
        // For Lightbox flow, we might want to update the DB directly if the user is in a "Auto-Refine" mode.
        // But for now, just success feedback is good.
        updateTask(taskId, { status: 'completed', progress: 100, message: '识别成功' });
        
        // If we want to automatically save the AI results to DB:
        const { photoMutationService } = await import('@/services/photoMutationService');
        await photoMutationService.update(photo.id, {
           name: result.data.name,
           description: result.data.description,
           description_translations: result.data.description_translations,
           category_id: result.data.category_id,
           tag_ids: Array.isArray(result.data.tag_ids) ? result.data.tag_ids.slice(0, 3) : [],
           manufacturer_id: result.data.manufacturer_id,
           model_number: result.data.model_number,
           price: result.data.price,
           dimensions: result.data.dimensions
        });

        queryClient.invalidateQueries({ queryKey: photoKeys.all });
        toast.success(`AI 识别完成并已更新: ${result.data.name || '照片'}`);
        return result.data;
      } else {
        throw ErrorFactory.wrap(new Error(result.message), 'analyzePhoto', photo.id);
      }
    } catch (err: any) {
      updateTask(taskId, { status: 'error', progress: 100, message: `识别失败: ${err.message}` });
      handleError(err, 'AI 解析失败');
      throw ErrorFactory.wrap(err, 'analyzePhoto', photo.id);
    }
  }, [addTask, updateTask, handleError]);

  return analyzePhoto;
}
