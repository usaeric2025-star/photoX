import { analyzeAndSavePhoto, autoGroupPhotos } from '@/services/ai/orchestration';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';
import { photoKeys, groupKeys } from '@/lib/queryKeys';
import { useTaskExecutor } from '../core/useTaskExecutor';


export function useAIAutoGrouping() {
  const queryClient = useQueryClient();
  const update = useUIStore((s) => s.update);
  const resetUI = useUIStore((s) => s.resetUI);
  const addProcessingIds = useUIStore((s) => s.addProcessingIds);
  const removeProcessingIds = useUIStore((s) => s.removeProcessingIds);
  const appLang = useUIStore((s) => s.appLang);
  const { runTask } = useTaskExecutor();

  const createAIGroup = async (photoIds: string[]) => {
    addProcessingIds(photoIds);
    try {
        const result = await runTask(
          appLang === 'zh' ? "AI 智能合组" : "AI Auto Grouping",
          async ({ updateProgress }) => {
            updateProgress(20, appLang === 'zh' ? '正在分析选中的照片关系...' : 'Analyzing relationships of selected photos...');
            const res = await autoGroupPhotos(photoIds);
            
            if (!res.ok) throw new Error(res.message);
            updateProgress(80, appLang === 'zh' ? '正在创建合组并刷新列表...' : 'Creating group & refreshing...');
            return res.data;
          },
          {
            showSuccessToast: true,
            showProgress: true,
            rethrow: true
          }
        );
        return result;
    } finally {
        removeProcessingIds(photoIds);
    }
  };

  const recognizeSinglePhoto = async (photoId: string) => {
    addProcessingIds([photoId]);
    try {
        const result = await runTask(
          appLang === 'zh' ? "AI 智能识别" : "AI Identification",
          async ({ updateProgress }) => {
            updateProgress(10, appLang === 'zh' ? '正在加载照片信息...' : 'Loading photo data...');
            const { loadPhotosByIds } = await import('@/services/photo/read');
            const res = await loadPhotosByIds([photoId]);
            if (!res.ok) throw new Error(res.message || '加载照片信息失败');
            const photo = res.data?.[0];
            if (!photo) throw new Error(appLang === 'zh' ? '未找到照片信息' : 'Photo not found');
        
            updateProgress(40, appLang === 'zh' ? '正在进行 AI 智能识别 (约需 2-3 秒)...' : 'Analyzing attributes with AI (approx 2-3s)...');
            const result = await analyzeAndSavePhoto(photo);
            
            updateProgress(80, appLang === 'zh' ? '正在解析模型识别结果并写入表单...' : 'Parsing AI attributes and injecting...');
            update({ editPhotoId: photoId });
            
            // Pass results via event
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ai-analysis-result', { detail: result }));
            }, 100);
        
            return result;
          },
          {
            showSuccessToast: true,
            showProgress: true,
            rethrow: true
          }
        );
        return result;
    } finally {
        removeProcessingIds([photoId]);
    }
  };

  const handleAIAction = async (photoIds: string[]) => {
    if (photoIds.length === 0) {
      toast.error(appLang === 'zh' ? '请先选择照片' : 'Please select photos first');
      return;
    }

    if (photoIds.length === 1) {
        await recognizeSinglePhoto(photoIds[0]);
    } else {
        await createAIGroup(photoIds);
        
        // 重置 UI
        resetUI();
        
        // 刷新列表
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: photoKeys.all }),
            queryClient.invalidateQueries({ queryKey: groupKeys.all })
        ]);
    }
  };

  return { handleAIAction, createAIGroup, recognizeSinglePhoto };
}
