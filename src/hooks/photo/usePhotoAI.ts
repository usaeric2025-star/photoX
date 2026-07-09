import { logger } from '#lib/logger.js';
import { useCallback } from 'react';
import { translateDimensionLabelToEnglish } from '#src/utils/display.js';
import { usePhotoEditSessionContext } from "#src/hooks/photo/usePhotoEditSessionContext.js";
import { ErrorFactory } from '#lib/error/index.js';
import { useAppQuery, queryClient } from '#lib/query/index.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { executeTask, createTask } from '#lib/task-queue/index.js';
import { useAdminMaintenance } from '../admin/useAdminMaintenance.js';
import { useSettings } from '../settings/useSettings.js';
import { useCategories } from '../category/useCategories.js';
import { useTags } from '../tag/useTags.js';
import { useFilters } from '../ui/index.js';
import { Tag, Photo, Category, PhotoAIResult } from '#src/types/index.js';
import { ApiResponse } from '#shared/apiContractSchema.js';
import { analyzePhoto } from '#src/features/ai/commands.js';
import { useUI, useAuth } from '#lib/store/index.js';
import { showToast } from '#lib/ui/toast.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { type PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { resolveTagNamesToIds } from '#src/services/tag/completion.js';
import { queryKeys } from '#lib/query/keys.js';
import { api } from '#lib/api.js';
import { usePermission } from '#src/hooks/core/auth/usePermission.js';
import { useTranslation } from '../core/index.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';
import { usePhotos, useInvalidatePhotos } from './usePhotos.js';


/**
 * ============================================================================
 * PHOTOX AI ORCHESTRATION & STATE MANAGEMENT (AI 狀態與生命週期管理)
 * ============================================================================
 * 
 * 📌 [未來擴充 / 增加 AI 功能之最高指導原則]
 * 1. 數據契約化：
 *    - 如果要增加新的 AI 功能（例如：自動標籤翻譯、木材質感分析、風格分類、估價建議）：
 *      - 第一步：去 `src/features/ai/types.ts` 擴充 `NormalizedPhotoAIOutput` 輸出契約。
 *      - 第二步：在 `src/features/ai/commands.ts` 或服務層中增加該特徵的解析適配。
 * 2. 避免頻繁修改本 Hook：
 *    - 本 Hook (`usePhotoAI`) 的職責「僅限於」 React 元件生命週期與 UI 表單的回填 (Form binding)、
 *      任務隊列狀態 (`executeTask`) 以及 React Query 緩存刷新的調度。
 *    - **嚴禁**在此 Hook 內部撰寫繁雜的非結構化 JSON 轉換邏輯。若 API 回傳變動，請在 Adapter 層處理。
 * 
 * 📌 [如何新增一個 AI 屬性或欄位？]
 * 1. 在 `src/types/photo.ts` 確保對應的 Photo 實體屬性存在。
 * 2. 修改 `src/features/ai/types.ts` 的 `NormalizedPhotoAIOutput` 加入新屬性。
 * 3. 在 `src/features/ai/commands.ts` 中，更新 `analyzePhoto` 的回傳物件（即完成 Adapter 對應）。
 * 4. 修改下方 `updates` 的回寫區塊，將資料寫入 `form.setFieldValue` 以及自動 Save 的 Payload。
 * ============================================================================
 */

const AIAnalysisSchema = v.object({
  imageUrl: v.string(),
});

/**
 * Hook to handle AI Analysis and backfilling for Photo Editing
 */
export function usePhotoEditAI() {
  const user = useAuth(s => s.user);
  const { form } = usePhotoEditSessionContext();
  const { modal, photoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const { t } = useTranslation();
  const { updatePhoto: { mutateAsync: updatePhoto } } = useAdminMaintenance();
  const { invalidateDetail, invalidateList, invalidateTags } = useInvalidatePhotos();
  const invalidateAIResult = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', id] });
  };

  // Fetch reference data for matching
  const { categories = [] } = useCategories();
  const { tags: allTags = [] } = useTags();

  const { submit: handleAiAnalyze, isLoading: isAnalyzing } = useFormSubmit({
    schema: AIAnalysisSchema,
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      if (!editPhotoId) throw new Error('Missing editPhotoId');
      
      const result = await executeTask({
        label: t('aiAnalyze'),
        type: 'ai-analyze',
        userId: user?.id,
        execute: async (signal, onProgress) => {
          onProgress(0, t('aiStarting'));
          onProgress(0.1, t('aiPreparing'));
          
          onProgress(0.3, t('aiAnalyzingAttributes'));
          const resp = await analyzePhoto(editPhotoId);
          
          onProgress(0.7, t('aiParsingResult'));
          
          if (!resp) {
            throw ErrorFactory.wrap(new Error('AI analysis failed (no result)'), t('aiAnalyze'), String(editPhotoId));
          }

          let result = (Array.isArray(resp) && resp.length > 0) ? resp[0] : resp;
          
          if (!result || typeof result !== 'object') {
            throw ErrorFactory.wrap(new Error('Invalid AI format'), t('invalidRawFormat'), String(editPhotoId));
          }

          const updates: Record<string, unknown> = {};
          
          if (result.name) {
            let cleanName = '';
            if (typeof result.name === 'object' && result.name !== null) {
              const n = result.name as Record<string, string>;
              cleanName = n.zh || n.en || n.ms || String(result.name);
            } else {
              cleanName = String(result.name);
            }
            updates.name = cleanName.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();
          }

          if (result.groupId !== undefined && result.groupId !== null || result.group_id !== undefined && result.group_id !== null) {
            const rawGroup = result.groupId || result.group_id;
            let targetGroupId: string | null = null;
            if (typeof rawGroup === 'string' && rawGroup.trim().length > 0 && rawGroup !== 'null' && rawGroup !== 'undefined') {
              targetGroupId = rawGroup.trim();
            } else if (typeof rawGroup === 'object' && rawGroup !== null) {
              const gObj = rawGroup as Record<string, unknown>;
              targetGroupId = String(gObj.id || gObj.groupId || gObj.group_id || '');
            }
            if (targetGroupId && targetGroupId !== 'undefined' && targetGroupId !== 'null') {
              updates.groupId = targetGroupId;
            }
          }

          if (result.category_id || result.categoryId || result.category_name || result.categoryName) {
            const rawCatId = String(result.category_id || result.categoryId || '');
            const rawCatName = String(result.category_name || result.categoryName || '');
            
            let matchedId: string | null = null;
            const currentCats = (queryClient.getQueryData<Category[]>(queryKeys.categories.list()) || categories) as Category[];
            if (rawCatId && currentCats.find(c => String(c.id) === rawCatId)) {
                matchedId = rawCatId;
            } 
            else if (rawCatName) {
                const found = currentCats.find(c => 
                    c.name.toLowerCase() === rawCatName.toLowerCase() ||
                    c.nameZh?.toLowerCase() === rawCatName.toLowerCase() ||
                    c.nameEn?.toLowerCase() === rawCatName.toLowerCase()
                );
                if (found) matchedId = String(found.id);
            }
            
            if (matchedId) {
                updates.categoryId = matchedId;
            }
          }
          
          if (result.itemCode || result.item_code) {
            updates.itemCode = String(result.itemCode || result.item_code);
          }

          const sourceTags: (string | { id?: string; tag_id?: string; tagId?: string; name?: string })[] = Array.isArray(result.tagNames) ? result.tagNames : (Array.isArray(result.tag_names) ? result.tag_names : []);
          const sourceTagIds: (string | { id?: string; tag_id?: string; tagId?: string; name?: string })[] = Array.isArray(result.tagIds) ? result.tagIds : (Array.isArray(result.tag_ids) ? result.tag_ids : []);

          const rawNames: string[] = sourceTags.map((rawTag) => {
              if (rawTag && typeof rawTag === 'object') {
                  return String(rawTag.name ?? rawTag.id ?? rawTag.tagId ?? rawTag.tag_id ?? '');
              }
              return String(rawTag);
          }).filter(Boolean);

          const parsedTagIds: string[] = sourceTagIds.map((t) => {
              if (t && typeof t === 'object') {
                  const tObj = t as Record<string, unknown>;
                  return String(tObj.id ?? tObj.tagId ?? tObj.tag_id ?? tObj.name ?? '');
              }
              return String(t);
          }).filter(Boolean);
          
          const resolvedIds: string[] = [];
          const unresolvedNames: string[] = [];
          
          [...parsedTagIds, ...rawNames].forEach((idOrName: string) => {
              const found = allTags.find(t => String(t.id) === idOrName || t.name.toLowerCase() === idOrName.toLowerCase());
              if (found) {
                  resolvedIds.push(String(found.id));
              } else {
                  unresolvedNames.push(idOrName);
              }
          });
          
          const uniqueRawNames = Array.from(new Set(unresolvedNames));
          const finalResolvedIds = [...resolvedIds];

          let filteredRawNames = [...uniqueRawNames];
          let finalFilteredResolvedIds = [...finalResolvedIds];

          if (updates.categoryId || result.categoryId || result.category_id) {
              const catId = updates.categoryId || result.categoryId || result.category_id;
              const chosenCategory = categories.find(c => String(c.id) === String(catId));
              if (chosenCategory) {
                  const catNames = [
                      chosenCategory.name.toLowerCase(),
                      chosenCategory.nameZh?.toLowerCase(),
                      chosenCategory.nameEn?.toLowerCase(),
                      chosenCategory.nameMs?.toLowerCase()
                  ].filter(Boolean);
                  
                  filteredRawNames = filteredRawNames.filter(n => !catNames.includes(n.toLowerCase()));
                  finalFilteredResolvedIds = finalFilteredResolvedIds.filter(id => {
                    const tag = allTags.find(t => String(t.id) === id);
                    if (!tag) return true;
                    return !catNames.includes(tag.name.toLowerCase());
                  });
              }
          }

          filteredRawNames = filteredRawNames.slice(0, 10);

          if (filteredRawNames.length > 0 || finalFilteredResolvedIds.length > 0) {
            try {
              const resolveResult = await resolveTagNamesToIds(filteredRawNames, allTags);

              let finalTagIds = [...finalFilteredResolvedIds];
              if (resolveResult && resolveResult.length > 0) {
                  finalTagIds = [...finalTagIds, ...resolveResult];
              }

              if (finalTagIds.length > 0) {
                  const uniqueIds = Array.from(new Set(finalTagIds)).slice(0, 3); // Limit to 3 for automatic selection
                  invalidateTags();
                  
                  const latestTags = await ErrorFactory.unwrap<{ data: Tag[] }>(
                    api.tags.$get(),
                    'Failed to fetch latest tags'
                  ).then(j => j.data).catch(() => allTags);

                  queryClient.setQueryData(queryKeys.tags.list(), (old: Tag[] | undefined) => {
                    const oldTags = Array.isArray(old) ? old : [];
                    const existingMap = new Map(oldTags.map((t: Tag) => [String(t.id), t]));
                    latestTags.forEach((t: Tag) => existingMap.set(String(t.id), t));
                    return Array.from(existingMap.values());
                  });

                  // Use latestTags instead of allTags to find the Tag objects for the form
                  updates.tags = uniqueIds.map(id => latestTags.find(t => String(t.id) === String(id))).filter(Boolean);
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
          if (Array.isArray(result.dimensions) && result.dimensions.length > 0) {
            updates.dimensions = result.dimensions.map((d: any) => {
              return {
                label: translateDimensionLabelToEnglish(String(d.label || t('dimensions'))),
                unit: (d.unit === 'inch' || d.unit === 'mm') ? d.unit : 'cm',
                length: Number(d.length) || 0,
                width: Number(d.width) || 0,
                height: Number(d.height) || 0,
                isAiEstimated: true,
                isAi: true
              };
            });
          }
          invalidateDetail(String(editPhotoId));

          if (result.raw_result) {
            updates.metadata = { ai_raw: result.raw_result };
          }

          Object.entries(updates).forEach(([key, value]) => {
            form.setFieldValue(key as keyof PhotoEditFormData, value as never);
          });
        
          if (editPhotoId) {
            try {
              await updatePhoto({ id: editPhotoId, updates });
              const detailKey = queryKeys.photos.detail(editPhotoId);
              
              queryClient.setQueryData(detailKey, (oldPhoto: Photo | undefined) => {
                if (!oldPhoto) return oldPhoto;

                const resolvedTags = Array.isArray(updates.tags)
                  ? allTags.filter(t => (updates.tags as string[]).includes(String(t.id)))
                  : oldPhoto.tags;
                
                const resolvedCategory = updates.categoryId
                  ? categories.find(c => String(c.id) === String(updates.categoryId))
                  : null;

                return {
                  ...oldPhoto,
                  name: updates.name ? (updates.name as string) : oldPhoto.name,
                  description: (updates.description as { zh: string; en: string; ms: string }) || oldPhoto.description,
                  categoryId: (updates.categoryId as string) || oldPhoto.categoryId,
                  categoryName: resolvedCategory ? resolvedCategory.name : oldPhoto.categoryName,
                  tags: resolvedTags || oldPhoto.tags,
                  dimensions: (updates.dimensions as import('#src/types/index.js').Dimension[]) || oldPhoto.dimensions,
                  isAiDimensions: (updates.isAiDimensions as boolean) ?? oldPhoto.isAiDimensions,
                  itemCode: (updates.itemCode as string) || oldPhoto.itemCode,
                  updatedAt: new Date().toISOString()
                };
              });
            } catch (saveError: unknown) {
              logger.warn(t('aiSaveFailedWarning'), saveError);
            }
          }
        
          invalidateList();
          if (editPhotoId) {
            invalidateAIResult(String(editPhotoId));
            // Manually update the query data to avoid waiting for the next fetch
            if (result.raw_result) {
              queryClient.setQueryData(['photos', 'ai-result', String(editPhotoId)], {
                photoId: editPhotoId,
                rawResult: result.raw_result,
                processedResult: result,
                createdAt: new Date().toISOString()
              });
            }
          }
          return result;
        }
      });
      return result;
    },
    onError: (err: unknown) => {
      ErrorFactory.handle(err, { context: 'AI Analysis' });
      showToast.error(t('aiAnalyzeFailed'));
    },
    successMessage: t('aiAnalyzeSuccessSimple'),
    errorMessage: t('aiAnalyzeFailed')
  });

  const onAnalyze = useCallback(async (previewSrc?: string, imageUrl?: string) => {
    const url = previewSrc || imageUrl;
    if (!url) return false;
    return await handleAiAnalyze({ imageUrl: url });
  }, [handleAiAnalyze]);

  const handleReExtract = useCallback(async (rawResult: unknown) => {
      if (!editPhotoId) {
          showToast.error(t('photoIdNotFound'));
          return;
      }
      
      const result = (Array.isArray(rawResult) && rawResult.length > 0) ? rawResult[0] : (rawResult as Record<string, unknown>);
      if (!result || typeof result !== 'object') {
          showToast.error(t('invalidRawFormat'));
          return;
      }

      const updates: Record<string, unknown> = {};
      
      if (result.name) {
          let cleanName = '';
          if (typeof result.name === 'object' && result.name !== null) {
              const n = result.name as Record<string, string>;
              cleanName = n.en || n.zh || n.ms || String(result.name);
          } else {
              cleanName = String(result.name);
          }
          updates.name = cleanName.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();
      }

      if (result.category_id || result.categoryId || result.category_name || result.categoryName) {
          const rawCatId = String(result.category_id || result.categoryId || '');
          const rawCatName = String(result.category_name || result.categoryName || '');
          
          let matchedId: string | null = null;
          const currentCats = (queryClient.getQueryData<Category[]>(queryKeys.categories.list()) || categories) as Category[];
          if (rawCatId && currentCats.find(c => String(c.id) === rawCatId)) {
              matchedId = rawCatId;
          } else if (rawCatName) {
              const found = currentCats.find(c => 
                  c.name.toLowerCase() === rawCatName.toLowerCase() ||
                  c.nameZh?.toLowerCase() === rawCatName.toLowerCase() ||
                  c.nameEn?.toLowerCase() === rawCatName.toLowerCase()
              );
              if (found) matchedId = String(found.id);
          }
          if (matchedId) updates.categoryId = String(matchedId);
      }

      const sourceTags = (Array.isArray(result.tagNames) ? result.tagNames : (Array.isArray(result.tag_names) ? result.tag_names : [])) as unknown[];
      if (sourceTags.length > 0) {
          const rawNames = sourceTags.map((t: unknown) => {
              if (t && typeof t === 'object') {
                  const tagObj = t as Record<string, unknown>;
                  return String(tagObj.name || tagObj.id || '');
              }
              return String(t);
          }).filter(Boolean);
          const resolved = await resolveTagNamesToIds(rawNames, allTags);
          if (resolved.length > 0) {
             updates.tags = resolved.slice(0, 5).map(id => allTags.find(t => String(t.id) === String(id))).filter(Boolean);
          }
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
        updates.dimensions = result.dimensions.map((d: any) => ({
            label: translateDimensionLabelToEnglish(String(d.label || t('dimensions'))),
            unit: (d.unit === 'inch' || d.unit === 'mm') ? d.unit : 'cm',
            length: Number(d.length) || 0,
            width: Number(d.width) || 0,
            height: Number(d.height) || 0,
            isAiEstimated: !!(d.isAiEstimated || d.is_ai_estimated),
            isAi: true
        }));
      }

      Object.entries(updates).forEach(([key, value]) => {
          form.setFieldValue(key as keyof PhotoEditFormData, value as never);
      });

      try {
          await updatePhoto({ id: editPhotoId, updates });
          invalidateDetail(editPhotoId);
          invalidateList();
          invalidateAIResult(editPhotoId);
          
          // Also update the source cache manually if possible
          if (result.raw_result) {
            queryClient.setQueryData(['photos', 'ai-result', editPhotoId], {
              photoId: editPhotoId,
              rawResult: result.raw_result,
              processedResult: result,
              createdAt: new Date().toISOString()
            });
          }
          
          showToast.success(t('reExtractSuccess'));
      } catch (e) {
          ErrorFactory.handle(e, { context: 'AI Re-extraction' });
          showToast.error(t('saveDataFailed'));
      }
  }, [editPhotoId, categories, allTags, form, updatePhoto, invalidateDetail, invalidateList, t]);

  return { handleAiAnalyze: onAnalyze, handleReExtract, isAnalyzing };
}

/**
 * 获取照片对应的 AI 识别原始源代碼與解析後的 JSON 數據。
 */
export function usePhotoAIResult(photoId: string, options?: { enabled?: boolean }) {
  const { isStaff } = usePermission();
  const isEnabled = isStaff && (options?.enabled !== false);

  return useAppQuery<PhotoAIResult | null>(
    (photoId && isEnabled) ? ['photos', 'ai-result', photoId] : null,
    async (): Promise<PhotoAIResult | null> => {
      try {
        return await ErrorFactory.unwrap<PhotoAIResult>(
          api.admin.photos["photo-ai-result"][":photoId"].$get({
            param: { photoId }
          }),
          'AI Analysis Failed'
        ) || null;
      } catch (err: unknown) {
        throw ErrorFactory.wrap(err, 'Network Error', photoId);
      }
    },
    { 
      staleTime: STALE_TIMES.PHOTO_LIST,
      enabled: isEnabled
    }
  );
}

/**
 * Handle Batch AI Analysis
 */
export function useAIBatchAnalysis() {
  const user = useAuth(s => s.user);
  const { invalidateAll } = useInvalidatePhotos();
  const { t } = useTranslation();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[]) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      ErrorFactory.handle(t('selectPhotoFirst'), { context: t('batchAi') });
      return;
    }
    
    showToast.info(t('aiAnalyzing'));
    const taskTitle = t('aiBatchTask', targetPhotos.length);

    createTask<{ successCount: number; groupSuccess: boolean }>({
        label: taskTitle,
        type: 'ai-analyze',
        userId: user?.id,
        meta: { photoCount: targetPhotos.length },
        execute: async (signal, onProgress) => {
            const { successCount, groupSuccess } = await runBatchAnalysis({
                targetPhotos,
                onProgress
            });

            invalidateAll();
            return { successCount, groupSuccess };
        },
        onComplete: (result) => {
            showToast.success(t('aiAnalyzeSuccess', result.successCount));
        }
    });

  }, [invalidateAll, t, user?.id]);

  return { handleBatchAiAnalyze };
}
