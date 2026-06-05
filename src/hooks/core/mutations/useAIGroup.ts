import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { analyzeGroup, analyzeSinglePhoto } from '@/services/gemini/groupAnalysis';
import { useUIStore } from '@/store/useUIStore';
import { photoKeys, groupKeys } from '@/lib/queryKeys';
import { ErrorFactory } from '../../../lib/error/ErrorFactory';

export function useAIGroup() {
  const queryClient = useQueryClient();
  const { update, resetUI, addProcessingIds, removeProcessingIds } = useUIStore();

  const createAIGroup = async (photoIds: string[]) => {
    // 乐观更新：加入处理中状态
    addProcessingIds(photoIds);
    try {
        // 1. 获取照片信息
        const { data: photos, error } = await supabase
          .from('furniture_items')
          .select('id, name, tag_ids')
          .in('id', photoIds);
    
        if (error) throw ErrorFactory.wrap(error, 'createAIGroup - fetchPhotos');
        if (!photos || photos.length === 0) throw ErrorFactory.wrap(new Error('未找到所选照片'), 'createAIGroup', photoIds.join(', '));
    
        // 为了让 AI 更好的分析，我们需要获取标签名称。
        const allTagIds = Array.from(new Set(photos.flatMap(p => p.tag_ids || [])));
        const { data: tagsData } = await supabase.from('tags').select('id, name').in('id', allTagIds);
        const tagMap = new Map((tagsData || []).map(t => [String(t.id), t.name]));
    
        const photosWithTags = photos.map(p => ({
          ...p,
          tagNames: (p.tag_ids || []).map((tid: string) => tagMap.get(String(tid)) || '').filter(Boolean)
        })) as any;
    
        // 2. AI 分析
        const analysis = await analyzeGroup(photosWithTags);
        const { name, description, colors, materials } = analysis;
    
        // Translate the group fields dynamically!
        let name_en = name || '';
        let name_ms = name || '';
        let description_en = description || '';
        let description_ms = description || '';

        try {
          const { data: settingsData } = await supabase.from('settings').select('gemini_api_key, custom_model').single();
          const { translateProductFields } = await import('@/services/gemini/translationCore');
          const pTranslations = await translateProductFields({
            name,
            description,
            colors,
            materials
          }, settingsData?.gemini_api_key || '', settingsData?.custom_model || '');

          name_en = pTranslations.name_en || name || '';
          name_ms = pTranslations.name_ms || name || '';
          description_en = pTranslations.description_en || description || '';
          description_ms = pTranslations.description_ms || description || '';
        } catch (e) {
          console.warn('[createAIGroup] Group translations skipped:', e);
        }

        // 3. 执行合组（合并照片、创建组、清理旧组）
        const searchParams = new URLSearchParams(window.location.search);
        const isCollapsed = searchParams.get('showGroupsCollapsed') !== 'false';
        
        const { groupPhotos } = await import('@/services/photo/commands');
        
        const result = await groupPhotos(photoIds, undefined, isCollapsed, {
            name: { zh: name, en: name_en, ms: name_ms },
            description: { zh: description, en: description_en, ms: description_ms },
            colors,
            materials
        });
    
        return result;
    } finally {
        removeProcessingIds(photoIds);
    }
  };

  const recognizeSinglePhoto = async (photoId: string) => {
    addProcessingIds([photoId]);
    try {
        // 获取照片信息
        const { data: photo, error } = await supabase
          .from('furniture_items')
          .select('*')
          .eq('id', photoId)
          .single();
    
        if (error) throw ErrorFactory.wrap(error, 'recognizeSinglePhoto - fetchPhoto');
        if (!photo) throw ErrorFactory.wrap(new Error('未找到照片信息'), 'recognizeSinglePhoto', photoId);
    
        // 同步获取标签名
        const { data: tagsData } = await supabase.from('tags').select('id, name').in('id', photo.tag_ids || []);
        const tagMap = new Map((tagsData || []).map(t => [String(t.id), t.name]));
        const photoWithTags = {
          ...photo,
          tagNames: (photo.tag_ids || []).map((tid: any) => tagMap.get(String(tid)) || '').filter(Boolean)
        } as any;
    
        // AI 分析
        const result = await analyzeSinglePhoto(photoWithTags);
    
        // 打开编辑抽屉，传入分析结果
        update({ editPhotoId: photoId });
        
        // 通过事件传递分析结果给抽屉
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('ai-analysis-result', { detail: result }));
        }, 100);
    
        return result;
    } finally {
        removeProcessingIds([photoId]);
    }
  };

  const handleAIAction = async (photoIds: string[]) => {
    if (photoIds.length === 0) {
      toast.error('请先選擇照片');
      return;
    }

    const lang = useUIStore.getState().appLang;

    const promise = (async () => {
        if (photoIds.length === 1) {
            return await recognizeSinglePhoto(photoIds[0]);
        } else {
            const result = await createAIGroup(photoIds);
            
            // 重置 UI
            resetUI();
            
            // 刷新列表
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: photoKeys.all }),
                queryClient.invalidateQueries({ queryKey: groupKeys.all })
            ]);
            
            return result;
        }
    })();

    toast.promise(promise, {
        loading: photoIds.length === 1 ? 'AI 正在分析照片...' : 'AI 正在智能合组...',
        success: (data: any) => {
             if (photoIds.length === 1) return 'AI 分析完成，已填充表单';
             const displayName = data.name?.[lang] || data.name?.zh || '新合组';
             return `已成功创建合组：${displayName}`;
        },
        error: (err) => err instanceof Error ? err.message : 'AI 处理失败'
    });
  };

  return { handleAIAction, createAIGroup, recognizeSinglePhoto };
}
