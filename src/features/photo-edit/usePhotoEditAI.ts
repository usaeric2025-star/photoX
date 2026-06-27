import { logger } from '@/lib/logger';
import { useCallback } from 'react';
import { usePhotoEditSessionContext } from "@/hooks/photo/usePhotoEditSessionContext";
import { ErrorFactory } from '@/lib/error';
import { appQuery } from '@/lib/query';
import { executeTask } from '@/lib/task-queue';
import { useAdminMaintenance, useSettings, useCategories, useTags, useFilters } from '@/hooks';
import { Tag, Photo } from '@/types';
import { analyzePhoto } from '@/features/ai/commands';
import { useUI, useAuth } from '@/lib/store';
import { aiAnalysisSignal } from '@/lib/ai/executor';

import { useFormSubmit } from '@/lib/forms/useFormSubmit';
import * as v from 'valibot';
import { PhotoEditFormData } from '@/schemas/photoEdit';

// Added static imports to fix Ineffective Dynamic Import warnings
import { resolveTagNamesToIds } from '@/services/tag/completion';
import { loadTagsFromCloud } from '@/services/tag/queries';
import { queryKeys } from '@/lib/query/keys';

const AIAnalysisSchema = v.object({
  imageUrl: v.string(),
});

/**
 * Hook to handle AI Analysis and backfilling for Photo Editing
 */
export function usePhotoEditAI() {
  const { user } = useAuth();
  const { form } = usePhotoEditSessionContext();
  const { modal, photoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const appLang = useUI((s) => s.appLang);
  const { updatePhoto: { mutateAsync: updatePhoto } } = useAdminMaintenance();

  // Fetch reference data for matching
  const { data: categories = [] } = useCategories();
  const { data: allTags = [] } = useTags();

  const { submit: handleAiAnalyze, isLoading: isAnalyzing } = useFormSubmit({
    schema: AIAnalysisSchema,
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      if (!editPhotoId) throw new Error('Missing editPhotoId');
      
      aiAnalysisSignal.set({ status: 'processing', photoId: editPhotoId });
      
      const result = await executeTask({
        label: appLang === 'zh' ? "AI 识别" : "AI Identification",
        type: 'ai-analyze',
        userId: user?.id,
        execute: async (signal, onProgress) => {
          onProgress(0, appLang === 'zh' ? '正在启动 AI 识别模块...' : 'Starting AI module...');
          onProgress(0.1, appLang === 'zh' ? '正在准备分析照片...' : 'Preparing photo files...');
          
          onProgress(0.3, appLang === 'zh' ? '正在由 AI 智能识别各项属性 (约需 2-5 秒)...' : 'Analyzing attributes with AI (approx 2-5s)...');
          const resp = await analyzePhoto(editPhotoId);
          
          onProgress(0.7, appLang === 'zh' ? '正在解析模型识别结果并写入草稿表單...' : 'Parsing AI attributes and injecting...');
          
          if (!resp) {
            throw ErrorFactory.wrap(new Error('AI analysis failed (no result)'), 'AI智能识别', String(editPhotoId));
          }

          let result = (Array.isArray(resp) && resp.length > 0) ? resp[0] : resp;
          
          if (!result || typeof result !== 'object') {
            throw ErrorFactory.wrap(new Error('Invalid AI format'), 'AI智能识别结果解析', String(editPhotoId));
          }

          const updates: Record<string, unknown> = {};
          
          if (result.name) {
            if (typeof result.name === 'object' && result.name !== null) {
              updates.name = result.name.zh || result.name.en || result.name.ms || String(result.name);
            } else {
              updates.name = String(result.name);
            }
          }

          // --- Strict Group Matching and Assignment Support ---
          if (result.group_id !== undefined && result.group_id !== null) {
            const rawGroup = result.group_id;
            let targetGroupId: string | null = null;
            if (typeof rawGroup === 'string' && rawGroup.trim().length > 0 && rawGroup !== 'null' && rawGroup !== 'undefined') {
              targetGroupId = rawGroup.trim();
            } else if (typeof rawGroup === 'object' && rawGroup !== null) {
              targetGroupId = String(rawGroup.id || rawGroup.group_id || '');
            }
            if (targetGroupId && targetGroupId !== 'undefined' && targetGroupId !== 'null') {
              updates.group_id = targetGroupId;
            }
          }

          // --- Strict Tag Matching (Full format-compatible) with auto-creation ---
          const sourceTags: (string | { id?: string; tag_id?: string; name?: string })[] = Array.isArray(result.tagNames) ? result.tagNames : (Array.isArray(result.tag_names) ? result.tag_names : []);
          const sourceTagIds: (string | { id?: string; tag_id?: string; name?: string })[] = Array.isArray(result.tagIds) ? result.tagIds : (Array.isArray(result.tag_ids) ? result.tag_ids : []);

          const rawNames: string[] = sourceTags.map((rawTag) => {
              if (rawTag && typeof rawTag === 'object') {
                  return String(rawTag.name ?? rawTag.id ?? rawTag.tag_id ?? '');
              }
              return String(rawTag);
          }).filter(Boolean);

          const parsedTagIds: string[] = sourceTagIds.map((t) => {
              if (t && typeof t === 'object') {
                  return String(t.id ?? t.tag_id ?? t.name ?? '');
              }
              return String(t);
          }).filter(Boolean);
          
          const resolvedIds: string[] = [];
          parsedTagIds.forEach((idOrName: string) => {
              const found = allTags.find(t => String(t.id) === idOrName || t.name.toLowerCase() === idOrName.toLowerCase());
              if (found) {
                  resolvedIds.push(String(found.id));
              } else {
                  rawNames.push(idOrName);
              }
          });
          
          let uniqueRawNames = Array.from(new Set(rawNames));
          let finalResolvedIds = [...resolvedIds];

          // Prevent tags that perfectly match the chosen category name
          if (updates.category_id) {
              const chosenCategory = categories.find(c => String(c.id) === updates.category_id);
              if (chosenCategory) {
                  const catNames = [
                      chosenCategory.name.toLowerCase(),
                      chosenCategory.zh?.toLowerCase(),
                      chosenCategory.en?.toLowerCase(),
                      chosenCategory.ms?.toLowerCase()
                  ].filter(Boolean);
                  
                  uniqueRawNames = uniqueRawNames.filter(n => !catNames.includes(n.toLowerCase()));
                  
                  // Also filter out resolved tags that have the same name
                  finalResolvedIds = finalResolvedIds.filter(id => {
                    const tag = allTags.find(t => String(t.id) === id);
                    if (!tag) return true;
                    return !catNames.includes(tag.name.toLowerCase());
                  });
              }
          }

          uniqueRawNames = uniqueRawNames.slice(0, 10);

          if (uniqueRawNames.length > 0 || finalResolvedIds.length > 0) {
            try {
              const resolveResult = await resolveTagNamesToIds(uniqueRawNames, allTags);

              let finalTagIds = [...finalResolvedIds];
              if (resolveResult && resolveResult.length > 0) {
                  finalTagIds = [...finalTagIds, ...resolveResult];
              }

              if (finalTagIds.length > 0) {
                  const uniqueIds = Array.from(new Set(finalTagIds)).slice(0, 3);
                  
                  // Refetch/Invalidate tags so the tag select options are in sync
                  await appQuery.mutate('tags');
                  
                  const latestTags = await loadTagsFromCloud().catch(() => allTags);

                  // Optimistically set the cache for tags so they display IMMEDIATELY
                  appQuery.mutate(queryKeys.tags.tags(), (old: Tag[] | undefined) => {
                    const oldTags = Array.isArray(old) ? old : [];
                    const existingMap = new Map(oldTags.map((t: Tag) => [String(t.id), t]));
                    latestTags.forEach((t: Tag) => existingMap.set(String(t.id), t));
                    return Array.from(existingMap.values());
                  });

                  updates.tags = uniqueIds.map(id => {
                    const found = latestTags.find((t: Tag) => String(t.id) === id) || allTags.find((t: Tag) => String(t.id) === id);
                    if (found) {
                      return { id: found.id, name: found.name || '' };
                    }
                    // Fallback
                    const matchingRaw = [...sourceTags, ...sourceTagIds].find((raw) => {
                      const rStr = typeof raw === 'object' && raw ? String(raw.id ?? raw.tag_id ?? raw.name ?? '') : String(raw);
                      return rStr.toLowerCase() === id.toLowerCase();
                    });
                    const nameVal = typeof matchingRaw === 'object' ? (matchingRaw.name || id) : (matchingRaw || id);
                    return { id, name: String(nameVal) };
                  });
              } else {
                  updates.tags = [];
              }
            } catch (err: unknown) {
              logger.error('Tags auto-creation failed:', err);
              updates.tags = [];
            }
          } else {
            updates.tags = [];
          }

          if (result.description) {
            if (typeof result.description === 'object' && result.description !== null) {
              updates.description = {
                zh: result.description.zh || '',
                en: result.description.en || '',
                ms: result.description.ms || ''
              };
            } else {
              updates.description = { zh: String(result.description), en: '', ms: '' };
            }
          }
          if (Array.isArray(result.dimensions)) {
            updates.dimensions = result.dimensions.map((d: Record<string, unknown>) => ({
              label: String(d.label || 'Dimension'),
              unit: (d.unit === 'inch' || d.unit === 'mm') ? d.unit : 'cm',
              length: Number(d.length) || 0,
              width: Number(d.width) || 0,
              height: Number(d.height) || 0,
              is_ai_estimated: !!d.is_ai_estimated,
              is_ai: true
            }));
          }
          // Invalidate the cache to instantly reveal JSON output in AI tab
          await appQuery.mutate(['photos', 'ai-result', editPhotoId]);

          Object.entries(updates).forEach(([key, value]) => {
            form.setFieldValue(key as keyof PhotoEditFormData, value as never);
          });
        
          if (editPhotoId) {
            try {
              await updatePhoto({ id: editPhotoId, updates, silent: true });
              
              // Synchronously update the cache for the photo detail query
              const detailKey = queryKeys.photos.detail(editPhotoId);
              
              await appQuery.mutate(detailKey, (oldPhoto: Photo | undefined) => {
                if (!oldPhoto) return oldPhoto;
                return {
                  ...oldPhoto,
                  name: updates.name ? { zh: (updates.name as string), en: '', ms: '' } : oldPhoto.name,
                  description: (updates.description as { zh: string; en: string; ms: string }) || oldPhoto.description,
                  category_id: (updates.category_id as string) || oldPhoto.category_id,
                  tags: (updates.tags as Tag[]) || oldPhoto.tags,
                  dimensions: (updates.dimensions as import('@/types').Dimension[]) || oldPhoto.dimensions,
                  is_ai_dimensions: (updates.is_ai_dimensions as boolean) ?? oldPhoto.is_ai_dimensions,
                  item_code: (updates.item_code as string) || oldPhoto.item_code,
                  updated_at: new Date().toISOString()
                };
              });
            } catch (saveError: unknown) {
              logger.warn('AI识别结果自动保存失败(但不影响回填):', saveError);
            }
          }
        
          // [V2.2] Standard invalidation per architecture rules
          await appQuery.mutate(queryKeys.photos.all);
          await appQuery.mutate(queryKeys.groups.all);
          
          return result;
        }
      });
      return result;
    },
    onSuccess: (result) => {
      aiAnalysisSignal.set({ status: 'completed', result });
    },
    onError: (error) => {
      aiAnalysisSignal.set({ status: 'failed', error: String(error) });
    },
    successMessage: appLang === 'zh' ? 'AI 識別補全成功' : 'AI Analysis completed',
    errorMessage: appLang === 'zh' ? 'AI 識別失敗' : 'AI Analysis failed'
  });

  const onAnalyze = useCallback(async (previewSrc?: string, imageUrl?: string) => {
    const url = previewSrc || imageUrl;
    if (!url) return false;
    return await handleAiAnalyze({ imageUrl: url });
  }, [handleAiAnalyze]);

  return { handleAiAnalyze: onAnalyze, isAnalyzing };
}
