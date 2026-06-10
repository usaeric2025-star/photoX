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

    if (!settings?.gemini_api_key) {
      toast.error("Google Gemini API Key is required.");
      return;
    }

    const toastId = toast.loading(appLang === 'zh' ? '正在智能识别...' : 'AI Analyzing...', { id: 'ai-analyze' });

    await runTask(appLang === 'zh' ? "AI 识别" : "AI Identification", async () => {
      const resp = await analyzePhoto(editPhotoId);
      if (resp.ok && resp.data) {
        let result = resp.data;
        if (Array.isArray(result) && result.length > 0) {
          result = result[0];
        }
        
        if (result && typeof result === 'object') {
          const updates: any = {};
          
          if (result.name) {
            updates.name = typeof result.name === 'object' ? result.name : { zh: String(result.name), en: '', ms: '' };
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

          // --- Strict Tag Matching ---
          if (Array.isArray(result.tag_ids)) {
            const matchedTagIds: string[] = [];
            
            result.tag_ids.slice(0, 10).forEach((rawTag: any) => {
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
                    // Match by Name
                    const nameMatch = allTags.find(t => t.name.toLowerCase() === tagStr.toLowerCase());
                    if (nameMatch) matchedTagIds.push(String(nameMatch.id));
                }
            });

            if (matchedTagIds.length > 0) {
                // Keep unique and limit to 5
                updates.tag_ids = Array.from(new Set(matchedTagIds)).slice(0, 5);
            }
          }

          if (result.description) {
            updates.description = typeof result.description === 'object' ? result.description : { zh: String(result.description), en: '', ms: '' };
          }
          if (Array.isArray(result.dimensions)) {
            updates.dimensions = result.dimensions.map((d: any) => ({ ...d, is_ai: true }));
          }
          if (result.price !== undefined && result.price !== null) {
            updates.price = String(result.price);
          }

          // [AI-RAW-DATA-SAVE] Ensure we always save the raw source code
          try {
            const { supabase } = await import('@/lib/supabase');
            const rawResultText = (resp as any).raw_result || JSON.stringify(result);
            await supabase.from('photo_ai_results').upsert({
              photo_id: editPhotoId,
              raw_result: rawResultText,
              parsed_data: result,
              created_at: new Date().toISOString()
            }, { onConflict: 'photo_id' });
            
            // Invalidate the cache to instantly reveal JSON output in AI tab
            queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', editPhotoId] });
          } catch (e) {
            console.warn('[AI Raw Save Failed]', e);
          }

          form.setValues({ ...form.values, ...updates });

          try {
            await updatePhoto({ id: editPhotoId, updates, silent: true });
            toast.success(appLang === 'zh' ? '已识别并保存' : 'Identified & Saved', { id: toastId });
          } catch (saveError: unknown) {
            console.error("Auto-save failed:", saveError);
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
  }, [editPhotoId, appLang, settings?.gemini_api_key, runTask, updatePhoto, form, queryClient, categories, allTags]);

  return { handleAiAnalyze };
}
