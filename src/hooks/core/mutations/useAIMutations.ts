import { createMutationHook } from './factory';
import { analyzeGroup } from '@/services/gemini/groupAnalysis';
import { supabase } from '@/lib/supabase';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { groupKeys, photoKeys } from '@/lib/queryKeys';

export const useAIGroupMutation = createMutationHook({
  entity: 'AI',
  action: 'Group',
  mutationFn: async (photoIds: string[]) => {
    // 1. 获取照片信息
    const { data: photos, error } = await supabase
      .from('furniture_items')
      .select('id, name, tag_ids')
      .in('id', photoIds);

    if (error) throw ErrorFactory.wrap(error, 'useAIGroupMutation - fetchPhotos');
    if (!photos || photos.length === 0) throw ErrorFactory.wrap(new Error('未找到所选照片'), 'useAIGroupMutation', photoIds.join(', '));

    // 2. AI 分析
    const analysis = await analyzeGroup(photos);
    const { name, description, colors, materials } = analysis;

    // 获取翻译逻辑（这里可以扩展，目前先使用分析出来的基本字段）
    const name_translations = { zh: name, en: name, ms: name };
    const description_translations = { zh: description, en: description, ms: description };

    // 3. 执行合组（合并照片、创建组、清理旧组）
    const { groupPhotos } = await import('@/services/photo/commands');
    const result = await groupPhotos(photoIds, undefined, true, {
      name: name_translations,
      description: description_translations,
      colors,
      materials
    });

    return result;
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '合组成功',
});
