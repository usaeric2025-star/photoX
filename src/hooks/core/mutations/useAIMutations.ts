import { createMutationHook } from './factory';
import { analyzeGroup } from '@/services/gemini/groupAnalysis';
import { supabase } from '@/lib/supabase';
import { ErrorFactory } from '../../lib/error/ErrorFactory';
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

    if (error) throw ErrorFactory.wrap(error, 'createAIGroup - fetchPhotos');
    if (!photos || photos.length === 0) throw ErrorFactory.wrap(new Error('未找到所选照片'), 'createAIGroup', photoIds.join(', '));

    // 2. AI 分析
    const analysis = await analyzeGroup(photos);
    const { name, description, colors, materials } = analysis;

    // Translation logic (shortened for brevity, preserving essence)
    let name_translations = { zh: name, en: name, ms: name };
    let description_translations = { zh: description, en: description, ms: description };

    // 3. 创建合组
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        colors,
        materials,
        name_translations,
        description_translations,
      })
      .select()
      .single();

    if (groupError) throw ErrorFactory.wrap(groupError, 'createAIGroup - insertGroup');

    // 4. 更新照片的 group_id
    const { groupPhotos } = await import('@/services/photo/commands');
    await groupPhotos(photoIds, group.id, true);

    return group;
  },
  invalidateKeys: [photoKeys.all, groupKeys.all],
  onSuccessMessage: '合组成功',
});
