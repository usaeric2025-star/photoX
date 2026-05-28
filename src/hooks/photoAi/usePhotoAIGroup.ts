
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User } from '@/types';
import { groupKeys } from '@/lib/queryKeys';
import { useTaskExecutor } from '@/hooks';
import { analyzeProductPhoto } from '@/services/geminiService';
import { resolveTagIdsBatch } from '@/utils/tagUtils';
import { cleanObject } from '@/services/utils';
import { savePhotoToCloud } from '@/services/photoService';
import { safeArray } from '@/lib/utils';

export const usePhotoAIGroup = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  tagNameToIdMap: Map<string, string>,
  base: any
) => {
  const queryClient = useQueryClient();
  const { runTask } = useTaskExecutor();
  const { currentControllers } = base;

  const analyzeGroup = useCallback(async (photos: Photo[]) => {
    if (photos.length === 0) throw new Error('当前合组中无可用照片');
    if (!geminiApiKey) throw new Error('未配置 API Key');
    
    await runTask(`群组识别 (${photos.length} 张)`, async () => {
      const controller = new AbortController();
      currentControllers.current.set('group', { controller });
      
      try {
        const first = photos.find(p => p.is_group_cover) || photos[0];
        const resRaw = await analyzeProductPhoto(first.uri || first.image_url!, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, first.category_id, first.name, controller.signal);
        const result = cleanObject(resRaw);
        const tagIds = (await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap)) as string[];
        
        const updatedPhotos = photos.map(p => ({
          ...p,
          category_id: result.category_id || p.category_id,
          tag_ids: Array.from(new Set([...safeArray(p.tag_ids), ...tagIds])).slice(0, 3)
        }));

        if (user) {
          for (const up of updatedPhotos) {
             try { await savePhotoToCloud(user.id, up); } catch (e) {}
          }
        }
        const firstGroupId = updatedPhotos[0]?.group_id;
        if (firstGroupId) {
          queryClient.invalidateQueries({ queryKey: groupKeys.detail(firstGroupId) });
        }
      } finally {
         currentControllers.current.delete('group');
      }
    }, { showSuccessToast: true, showErrorToast: true });
  }, [user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, tagNameToIdMap, currentControllers, queryClient, runTask]);

  return { analyzeGroup };
};
