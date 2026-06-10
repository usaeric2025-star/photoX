import { analyzeAndSavePhoto, autoGroupPhotos } from '@/services/ai/orchestration';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';
import { photoKeys, groupKeys } from '@/lib/queryKeys';


export function useAIAutoGrouping() {
  const queryClient = useQueryClient();
  const update = useUIStore((s) => s.update);
  const resetUI = useUIStore((s) => s.resetUI);
  const addProcessingIds = useUIStore((s) => s.addProcessingIds);
  const removeProcessingIds = useUIStore((s) => s.removeProcessingIds);

  const createAIGroup = async (photoIds: string[]) => {
    addProcessingIds(photoIds);
    try {
        const result = await autoGroupPhotos(photoIds);
        
        if (!result.ok) throw new Error(result.message);
        return result.data;
    } finally {
        removeProcessingIds(photoIds);
    }
  };

  const recognizeSinglePhoto = async (photoId: string) => {
    addProcessingIds([photoId]);
    try {
        const { loadPhotosByIds } = await import('@/services/photo/read');
        const res = await loadPhotosByIds([photoId]);
        if (!res.ok) throw new Error(res.message);
        const photo = res.data?.[0];
        if (!photo) throw new Error('未找到照片信息');
    
        const result = await analyzeAndSavePhoto(photo);
        update({ editPhotoId: photoId });
        
        // Pass results via event
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
        loading: photoIds.length === 1 ? 'AI 正在识别...' : 'AI 正在分析并合组...',
        success: (data: any) => {
             if (photoIds.length === 1) return 'AI 识别完成';
             const displayName = data.name?.zh || data.name?.en || '新合组';
             return `成功创建合组：${displayName}`;
        },
        error: (err) => err instanceof Error ? err.message : '操作失败'
    });
  };

  return { handleAIAction, createAIGroup, recognizeSinglePhoto };
}
