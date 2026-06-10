import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTaskExecutor, useAdminActions, useSettings, PhotoEditFormReturn } from '@/hooks';
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

    await runTask(appLang === 'zh' ? "AI 属性智能识别" : "AI Analyzing", async () => {
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
          if (result.category_id !== undefined && result.category_id !== null) {
            const cat = result.category_id;
            if (Array.isArray(cat) && cat.length > 0) {
              const first = cat[0];
              updates.category_id = String(first.id ?? first.category_id ?? first);
            } else if (typeof cat === 'object' && cat !== null) {
              updates.category_id = String(cat.id ?? cat.category_id ?? '');
            } else {
              updates.category_id = String(cat);
            }
            if (updates.category_id === 'undefined' || updates.category_id === 'null' || updates.category_id === '[object Object]') {
              delete updates.category_id;
            }
          }
          if (Array.isArray(result.tag_ids)) {
            updates.tag_ids = result.tag_ids.slice(0, 5).map((id: any) => {
              if (id && typeof id === 'object') {
                return String(id.id ?? id.tag_id ?? id.name ?? '');
              }
              return String(id);
            }).filter((id: string) => id && id !== 'undefined' && id !== 'null' && id !== '[object Object]');
          }
          if (result.description) {
            updates.description = typeof result.description === 'object' ? result.description : { zh: String(result.description), en: '', ms: '' };
          }
          if (Array.isArray(result.dimensions)) {
            updates.dimensions = result.dimensions;
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
          } catch (e) {
            console.warn('[AI Raw Save Failed]', e);
          }

          form.setValues({ ...form.values, ...updates });

          try {
            await updatePhoto({ id: editPhotoId, updates });
            toast.success('已识别并自动保存');
          } catch (saveError: unknown) {
            console.error("Auto-save failed:", saveError);
            toast.warning('识别成功，保存失败');
          }
        } else {
          throw new Error('AI 返回的格式异常');
        }
      } else {
        throw new Error((resp as any).message || 'AI 属性智能识别失败');
      }
    });
  }, [editPhotoId, appLang, settings?.gemini_api_key, runTask, updatePhoto, form]);

  return { handleAiAnalyze };
}
