
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User } from '@/types';
import { groupKeys } from '@/lib/queryKeys';
import { useTaskExecutor } from '@/hooks'; // Simplified Feedback handled by useTaskExecutor and factory-like error handling
import { analyzeProductPhoto } from '@/services/geminiService';
import { cleanObject } from '@/services/utils';
import { savePhotoToCloud } from '@/services/photoService';

export const usePhotoAISingle = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  base: any
) => {
  const queryClient = useQueryClient();
  const { runTask } = useTaskExecutor();
  const { currentControllers } = base;

  const analyzeSingle = useCallback(async (photo: Photo) => {
    const imageData = photo.uri || photo.image_url;
    if (!imageData) throw new Error('未找到有效的照片源');
    
    return await runTask(`AI 单图识别 ${photo.id}`, async () => {
      const controller = new AbortController();
      currentControllers.current.set('single', { controller });
      
      try {
        if (!geminiApiKey) throw new Error('API Key 为空');
        const resRaw = await analyzeProductPhoto(imageData, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, photo.category_id, photo.name, controller.signal);
        const result = cleanObject(resRaw);
        
        // Save result via Service
        if (user) { await savePhotoToCloud(user.id, { ...photo, ...result }); }
        
        // Invalidate Query
        // Invalidate specific photo query
        queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', photo.id] });
        if (photo.group_id) {
          queryClient.invalidateQueries({ queryKey: groupKeys.detail(photo.group_id) });
        }
        
        return result;
      } finally {
        currentControllers.current.delete('single');
      }
    }, { showSuccessToast: true, showErrorToast: true });
  }, [user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, runTask, queryClient, currentControllers]);

  return { analyzeSingle };
};
