import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useTaskExecutor } from '@/hooks';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { toast } from 'sonner';

export function useAIBatchAnalysis() {
  const { runTask } = useTaskExecutor();
  const { updatePhoto } = useAdminActions();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      toast.error('请先选择照片 / Please select photos first');
      return;
    }

    const toastId = toast.loading(`准备分析 ${targetPhotos.length} 张照片...`);

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;

    try {
      await runTask(taskTitle, async ({ updateProgress }) => {
        let successCount = 0;
      const totalPhotosToProcess = targetPhotos.length;
      let progress = 0;

      // 1. Analyze photos
      const { analyzePhoto } = await import('@/services/ai/commands');
      
      const withTimeout = (promise: Promise<any>, ms: number) => {
          const timeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('请求超时')), ms)
          );
          return Promise.race([promise, timeout]);
      };
      
      for (let i = 0; i < targetPhotos.length; i++) {
        const p = targetPhotos[i];
        try {
          updateProgress(progress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
          const resp = await withTimeout(analyzePhoto(p.id), 60000); // 60s timeout
          
          if (resp && 'ok' in resp && resp.ok) {
            const result = resp.data;
            const updates: any = {};
            
            if (result.name) {
              updates.name = result.name;
            }
            if (result.category_id) updates.category_id = String(result.category_id);
            if (Array.isArray(result.tag_ids)) {
              updates.tag_ids = result.tag_ids.slice(0, 3).map((id: any) => String(id));
            }
            if (result.description) updates.description = result.description;
            if (result.description_translations) {
              updates.description_translations = result.description_translations;
            }
            if (Array.isArray(result.dimensions)) updates.dimensions = result.dimensions;
            if (result.price) updates.price = String(result.price);

            await updatePhoto(p.id, updates, { successMessage: null });
            successCount++;
          }
        } catch (err: any) {
          console.error(`Failed to analyze photo ${p.id}:`, err);
        }
        progress = ((i + 1) / totalPhotosToProcess) * (groupId ? 70 : 100);
        updateProgress(progress);
      }

      // 2. Analyze group
      if (groupId) {
         try {
            updateProgress(75, '正在总结合组...');
            const { analyzeGroup } = await import('@/services/gemini/groupAnalysis');
            
            // fetch fresh photos with tags for the group
            const { supabase } = await import('@/lib/supabase');
            const { data: photos } = await supabase.from('furniture_items').select('id, name, tag_ids, description').in('id', targetPhotos.map(p => p.id));
            
            if (photos) {
              const allTagIds = Array.from(new Set(photos.flatMap(p => p.tag_ids || [])));
              const { data: tagsData } = await supabase.from('tags').select('id, name').in('id', allTagIds);
              const tagMap = new Map((tagsData || []).map(t => [String(t.id), t.name]));
              const photosWithTags = photos.map(p => ({
                ...p,
                tagNames: (p.tag_ids || []).map((tid: string) => tagMap.get(String(tid)) || '').filter(Boolean)
              })) as any;

              const analysis = await withTimeout(analyzeGroup(photosWithTags), 120000); // 120s timeout
              const { name, description, colors, materials } = analysis;

              let finalName = { ...name };
              let finalDescription = {
                zh: description,
                en: description,
                ms: description
              };

              try {
                updateProgress(85, '正在翻译合组信息...');
                const { data: settingsData } = await supabase.from('settings').select('gemini_api_key, custom_model').single();
                const { translateProductFields } = await import('@/services/gemini/translationCore');
                const pTranslations = await translateProductFields({
                  name: name.zh,
                  description,
                  colors,
                  materials
                }, settingsData?.gemini_api_key || '', settingsData?.custom_model || '');

                finalName.en = pTranslations.name_en || name.en || name.zh;
                finalName.ms = pTranslations.name_ms || name.ms || name.zh;
                finalDescription.en = pTranslations.description_en || description;
                finalDescription.ms = pTranslations.description_ms || description;
              } catch (e) {
                console.warn('Group translations skipped:', e);
              }

              updateProgress(95, '正在保存合组...');
              const { updateGroup } = await import('@/services/group/commands');
              await updateGroup(groupId, {
                 name: finalName as any,
                 description: finalDescription as any,
                 colors,
                 materials
              });
            }
         } catch (e: any) {
            console.error('Group analysis failed', e);
            toast.error(`总结合组保存失败: ${e.message}`);
         }
         updateProgress(100);
      }

      if (successCount === 0 && totalPhotosToProcess > 0) {
        toast.error(`分析 ${totalPhotosToProcess} 张 ${groupId ? '组内' : ''}照片均失败 / AI Analysis failed`);
      } else if (successCount < totalPhotosToProcess) {
        toast.warning(`部分分析成功 (${successCount}/${totalPhotosToProcess}张${groupId ? '组内照' : ''})`);
      } else {
        toast.success(`成功分析 ${successCount} 张${groupId ? '组内' : ''}照片 / AI Analysis complete`);
      }
    }, { showProgress: true, showSuccessToast: false });
    } finally {
      toast.dismiss(toastId);
    }
  }, [runTask, updatePhoto]);

  return { handleBatchAiAnalyze };
}
