import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useTaskExecutor, useInvalidatePhotos, useSettings } from '@/hooks';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { groupKeys } from '@/lib/queryKeys';
import { 
  analyzeAndSavePhoto, 
  analyzeAndSaveGroup, 
  hasExistingInfo 
} from '@/services/ai/orchestration';

export function useAIBatchAnalysis() {
  const { runTask } = useTaskExecutor();
  const invalidatePhotos = useInvalidatePhotos();
  const queryClient = useQueryClient();
  const { settings } = useSettings();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      toast.error('请先选择照片 / Please select photos first');
      return;
    }

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;

    await runTask(taskTitle, async ({ updateProgress, taskId }) => {
        let successCount: number = 0;
        const totalPhotosToProcess = targetPhotos.length;
        let progress = 0;

        const { supabase } = await import('@/lib/supabase');

        // 1. Prefetch metadata once to avoid redundant network calls during batch processing
        let dbCategories: any[] = [];
        let dbTags: any[] = [];
        try {
          const [{ data: catsRes }, { data: tagsRes }] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('tags').select('*'),
          ]);
          if (catsRes) dbCategories = catsRes;
          if (tagsRes) dbTags = tagsRes;
        } catch (e) {
          console.error("[AI Batch] Prefetch metadata failed", e);
        }
        
        // 2. Process photos sequentially
        for (let i = 0; i < targetPhotos.length; i++) {
          const p = targetPhotos[i];
          
          if (hasExistingInfo(p)) {
            progress = ((i + 1) / totalPhotosToProcess) * (groupId ? 70 : 100);
            updateProgress(progress, `保留已有信息: ${i + 1}/${totalPhotosToProcess}`);
            continue;
          }

          try {
            updateProgress(progress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
            const result = await analyzeAndSavePhoto(p, settings, dbTags, dbCategories);
            
            if (result.success) {
                successCount++;
                // Minor debounce-like behavior: we'll invalidate at the end or halfway for big batches
                if (totalPhotosToProcess < 5) await invalidatePhotos();
            } else {
                console.error(`[AI Batch] Photo ${p.id} failed:`, result.error);
            }
          } catch (err: any) {
            console.error(`[AI Batch] Fatal photo ${p.id} error:`, err);
          }
          progress = ((i + 1) / totalPhotosToProcess) * (groupId ? 70 : 100);
          updateProgress(progress);
        }

        let groupSuccess = false;

        // 3. Analyze group (If requested)
        if (groupId) {
           try {
              updateProgress(75, '正在总结合组...');
              const { loadPhotosByIds } = await import('@/services/photo/read');
              
              const res = await loadPhotosByIds(targetPhotos.map(p => p.id));
              if (!res.ok) throw new Error('获取产品失败: ' + res.message);

              const photos = res.data;
              if (photos) {
                updateProgress(85, '总结并翻译合组信息...');
                const groupRes = await analyzeAndSaveGroup(groupId, photos, settings);
                if (groupRes.success) {
                  groupSuccess = true;
                } else {
                  console.error('[AI Group] Persistence failed:', groupRes.error);
                }
              }
           } catch (e: any) {
              console.error('[AI Group] Analysis or persistence failed', e);
           }
        }
        
        // Final Sync
        await invalidatePhotos();
        if (groupId) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
            queryClient.invalidateQueries({ queryKey: groupKeys.all })
          ]);
        }
        
        let finalMessage = "分析完成 (无更新)";
        if (groupId && groupSuccess) {
          finalMessage = successCount > 0 
            ? `成功分析并更新合组信息，且更新了 ${successCount} 张照片 / Succeeded in updating group details and analyzing ${successCount} photos!`
            : "成功分析并更新合组信息 / Succeeded in analyzing and updating group details!";
          toast.success(finalMessage);
        } else if (successCount > 0) {
          finalMessage = `成功分析 ${successCount} 张照片 / Successfully analyzed ${successCount} photos!`;
          toast.success(finalMessage);
        } else {
          toast.info("分析完成，没有发现需要更新的数据 / Analysis complete, no fields required updating.");
        }

        if (taskId) updateProgress(100, finalMessage);
        return successCount;
    }, { showProgress: true, showSuccessToast: false });
  }, [runTask, invalidatePhotos, queryClient]);

  return { handleBatchAiAnalyze };
}
