import { logger } from '@/lib/logger';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useTaskExecutor, useAdminActions, useSettings, PhotoEditFormReturn, useCategories, useTags } from '@/hooks';
import { analyzePhoto } from '@/services/ai/commands';
import { useUIStore } from '@/store';

/**
 * Hook to handle AI Analysis and backfilling for Photo Editing
 */
export function usePhotoEditAI(form: PhotoEditFormReturn) {
  const editPhotoId = useUIStore((s) => s.editPhotoId);
  const appLang = useUIStore((s) => s.appLang);
  const { runTask } = useTaskExecutor();
  const { updatePhoto: { mutateAsync: updatePhoto } } = useAdminActions();
  const { settings } = useSettings();
  const queryClient = useQueryClient();

  // Fetch reference data for matching
  const { data: categories = [] } = useCategories();
  const { data: allTags = [] } = useTags();

  const handleAiAnalyze = useCallback(async (previewSrc?: string, imageUrl?: string) => {
    const finalImageUrl = previewSrc || imageUrl;
    if (!finalImageUrl || !editPhotoId) {
      toast.error(appLang === 'zh' ? '照片信息缺失，无法分析' : 'Photo data missing');
      return;
    }

    const toastId = toast.loading(appLang === 'zh' ? '正在智能识别...' : 'AI Analyzing...', { id: 'ai-analyze' });

    await runTask(appLang === 'zh' ? "AI 识别" : "AI Identification", async () => {
      const resp = await analyzePhoto(editPhotoId);
      if (resp.ok && resp.data) {
        let result = resp.data as any;
        if (Array.isArray(result) && result.length > 0) {
          result = result[0];
        }
        
        if (result && typeof result === 'object') {
          const updates: any = {};
          
          if (result.name) {
            updates.name = typeof result.name === 'object'
              ? {
                  zh: result.name.zh || '',
                  en: result.name.en || '',
                  ms: result.name.ms || ''
                }
              : { zh: String(result.name), en: '', ms: '' };
          }

          // --- Strict Category Matching ---
          if (result.category_id !== undefined && result.category_id !== null) {
            const rawCat = result.category_id;
            let targetId: string | undefined;

            // 1. Try to extract string value
            let catStr = '';
            if (Array.isArray(rawCat) && rawCat.length > 0) {
                const first = rawCat[0];
                catStr = String(first.id ?? first.category_id ?? first.name ?? first);
            } else if (typeof rawCat === 'object' && rawCat !== null) {
                catStr = String(rawCat.id ?? rawCat.category_id ?? rawCat.name ?? '');
            } else {
                catStr = String(rawCat);
            }

            if (catStr && catStr !== 'undefined' && catStr !== 'null' && catStr !== '[object Object]' && catStr !== '[对象 对象]') {
                // 2. Exact ID match
                const exactMatch = categories.find(c => String(c.id) === catStr);
                if (exactMatch) {
                    targetId = String(exactMatch.id);
                } else {
                    // 3. Fuzzy Name match (Case-insensitive)
                    const nameMatch = categories.find(c => 
                        c.name.toLowerCase() === catStr.toLowerCase() ||
                        (c.zh && c.zh.toLowerCase() === catStr.toLowerCase())
                    );
                    if (nameMatch) targetId = String(nameMatch.id);
                }
            }

            if (targetId) updates.category_id = targetId;
          }

          // --- Strict Tag Matching (Full format-compatible) ---
          const sourceTags = result.tagNames || result.tag_names || result.tagIds || result.tag_ids || [];
          if (Array.isArray(sourceTags)) {
            const matchedTagIds: string[] = [];
            
            sourceTags.slice(0, 10).forEach((rawTag: any) => {
                let tagStr = '';
                if (rawTag && typeof rawTag === 'object') {
                    tagStr = String(rawTag.id ?? rawTag.tag_id ?? rawTag.name ?? '');
                } else {
                    tagStr = String(rawTag);
                }

                if (!tagStr || tagStr === 'undefined' || tagStr === 'null' || tagStr === '[object Object]' || tagStr === '[对象 对象]') return;

                // Match by ID
                const exactMatch = allTags.find(t => String(t.id) === tagStr);
                if (exactMatch) {
                    matchedTagIds.push(String(exactMatch.id));
                } else {
                    // Match by Name (Case-insensitive)
                    const nameMatch = allTags.find(t => t.name.toLowerCase() === tagStr.toLowerCase());
                    if (nameMatch) {
                        matchedTagIds.push(String(nameMatch.id));
                    }
                }
            });

            if (matchedTagIds.length > 0) {
                const uniqueIds = Array.from(new Set(matchedTagIds)).slice(0, 5);
                // Map to tag objects { id, name } expected by form State & TagEditor
                updates.tags = uniqueIds.map(id => {
                  const found = allTags.find(t => String(t.id) === id);
                  return found ? { id: found.id, name: found.name || '' } : { id: String(id), name: '' };
                });
            } else {
                updates.tags = [];
            }
          }

          if (result.description) {
            updates.description = typeof result.description === 'object'
              ? {
                  zh: result.description.zh || '',
                  en: result.description.en || '',
                  ms: result.description.ms || ''
                }
              : { zh: String(result.description), en: '', ms: '' };
          }
          if (Array.isArray(result.dimensions)) {
            updates.dimensions = result.dimensions.map((d: any) => ({ ...d, is_ai: true }));
          }
          if (result.price !== undefined && result.price !== null) {
            updates.price = String(result.price);
          }

          // [AI-RAW-DATA-SAVE] Ensure we always save the raw source code
          try {
            const rawResultText = (resp as any).data?.raw_result || (resp as any).raw_result || JSON.stringify(result);
            const parsedDataObj = (resp as any).data || result;
            const { api } = await import('@/lib/api');
            await (api as any).photos['ai-result'].$post({
              json: {
                payload: {
                  photo_id: editPhotoId,
                  raw_result: rawResultText,
                  parsed_data: parsedDataObj,
                  created_at: new Date().toISOString()
                }
              }
            });
            
            // Invalidate the cache to instantly reveal JSON output in AI tab
            queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', editPhotoId] });
          } catch (e) {
            logger.warn('[AI Raw Save Failed]', e);
          }

          form.setValues({ ...form.values, ...updates });

          try {
            await updatePhoto({ id: editPhotoId, updates, silent: true });
            toast.success(appLang === 'zh' ? '已识别并保存' : 'Identified & Saved', { id: toastId });
          } catch (saveError: unknown) {
            logger.error("Auto-save failed:", saveError);
            toast.warning(appLang === 'zh' ? '识别成功，自动保存失败' : 'Analysis ok, save failed', { id: toastId });
          }
        } else {
          toast.error(appLang === 'zh' ? 'AI 返回格式异常' : 'Invalid AI format', { id: toastId });
          throw new Error('AI 返回的格式异常');
        }
      } else {
        toast.error(appLang === 'zh' ? '识别过程中断' : 'Analysis interrupted', { id: toastId });
        throw new Error((resp as any).message || 'AI 属性智能识别失败');
      }
    }, { silent: true });
  }, [editPhotoId, appLang, settings?.agnes_api_key, runTask, updatePhoto, form, queryClient, categories, allTags]);

  return { handleAiAnalyze };
}
