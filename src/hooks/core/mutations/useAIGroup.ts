import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { analyzeGroup, analyzeSinglePhoto } from '@/services/gemini/groupAnalysis';
import { useUIStore } from '@/store/useUIStore';
import { photoKeys, groupKeys } from '@/lib/queryKeys';

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
    
        if (error) throw error;
        if (!photos || photos.length === 0) throw new Error('未找到所选照片');
    
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
    
        // 3. 创建合组
        const { data: group, error: groupError } = await supabase
          .from('groups')
          .insert({
            name,
            description,
            colors,
            materials,
            name_translations: { zh: name },
            description_translations: { zh: description },
          })
          .select()
          .single();
    
        if (groupError) throw groupError;
    
        // 4. 更新照片的 group_id
        const { error: updateError } = await supabase
          .from('furniture_items')
          .update({ group_id: group.id })
          .in('id', photoIds);
    
        if (updateError) throw updateError;
    
        return group;
    } finally {
        // 其实 resetUI 会清理 processingIds，但在 error 时我们也需要确保清理
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
    
        if (error) throw error;
        if (!photo) throw new Error('未找到照片信息');
    
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
      toast.error('请先选择照片');
      return;
    }

    const promise = (async () => {
        if (photoIds.length === 1) {
            return await recognizeSinglePhoto(photoIds[0]);
        } else {
            const group = await createAIGroup(photoIds);
            
            // 重置 UI
            resetUI();
            
            // 刷新列表
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: photoKeys.lists() }),
                queryClient.invalidateQueries({ queryKey: groupKeys.all })
            ]);
            
            return group;
        }
    })();

    toast.promise(promise, {
        loading: photoIds.length === 1 ? 'AI 正在分析照片...' : 'AI 正在智能合组...',
        success: (data: any) => {
             return photoIds.length === 1 ? 'AI 分析完成，已填充表单' : `已成功创建合组：${data.name}`;
        },
        error: (err) => err instanceof Error ? err.message : 'AI 处理失败'
    });
  };

  return { handleAIAction, createAIGroup, recognizeSinglePhoto };
}
