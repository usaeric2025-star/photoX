import { useAtomValue } from 'jotai';
import { userAtom } from '#src/store/index.js';
import { useCallback, useState } from 'react';
import { translateDimensionLabelToEnglish } from '#src/utils/display.js';
import { usePhotoEditSessionContext } from "./PhotoEditSession.js";
import { ErrorFactory } from '#lib/error/index.js';
import { queryClient } from '#lib/query/index.js';
import { useAdminActions, useCategories, useTags, useFilters, useTranslation } from '#src/hooks/index.js';
import { Tag } from '#src/types/index.js';
import { } from '#lib/store/index.js';
import { feedback } from '#lib/feedback.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { type PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { useInvalidatePhotos } from '#src/hooks/photo/index.js';
import { AIService } from '#src/lib/ai/AIService.js';
import { mapAnalysisToUpdates } from '#src/features/ai/orchestration.js';
import { normalizeUnit } from '#src/utils/photo.js';

export { usePhotoAIResult } from '#src/hooks/photo/index.js';

const AIAnalysisSchema = v.object({
  imageUrl: v.string(),
});

/**
 * usePhotoEditAI
 * 
 * 處理照片編輯過程中的 AI 識別、自動回填與自動保存。
 */
export function usePhotoEditAI() {
  const user = useAtomValue(userAtom);
  const session = usePhotoEditSessionContext();
  const form = session.form;
  const sessionPhotoId = session.photoId;
  const { modal, photoId: filterPhotoId } = useFilters();
  const editPhotoId = sessionPhotoId || (modal === 'edit' ? filterPhotoId : null);
  const { t } = useTranslation();
  const { updatePhoto } = useAdminActions();
  const { invalidateDetail, invalidateList, invalidateTags } = useInvalidatePhotos();
  
  const [isReExtracting, setIsReExtracting] = useState(false);
  const { categories = [] } = useCategories();
  const { tags: allTags = [] } = useTags();

  const { submit: handleAiAnalyze, isLoading: isAnalyzing } = useFormSubmit({
    schema: AIAnalysisSchema,
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      if (!editPhotoId) throw new Error('Missing photoId');
      
      const rawResult = await AIService.analyze({ id: editPhotoId, thumbnailUrl: imageUrl });
      
      const updates = await mapAnalysisToUpdates(rawResult, allTags, categories);

      // 尺寸翻譯額外處理 (Ensure icons/units are consistent)
      if (Array.isArray(updates.dimensions)) {
        updates.dimensions = updates.dimensions.map((d: { label?: string; unit?: string; value?: string | number }) => ({
          ...d,
          label: translateDimensionLabelToEnglish(String(d.label || t('dimensions'))),
          unit: normalizeUnit(d.unit, d),
          isAi: true,
          isAiEstimated: true
        }));
      }

      // 回填表單
      Object.entries(updates).forEach(([key, value]) => {
        if (!['unresolvedTagNames', 'resolvedTagIds'].includes(key)) {
          form.setFieldValue(key as keyof PhotoEditFormData, value as never);
        }
      });

      // 自動保存到後端 (including resolved tags if any)
      const savePayload = { ...updates };
      if (updates.resolvedTagIds) {
        const resolvedTagIds = updates.resolvedTagIds as Array<string | number>;
        const resolvedTags = resolvedTagIds.map((id: number | string) => allTags.find(t => String(t.id) === String(id))).filter((t): t is Tag => !!t);
        form.setFieldValue('tags', resolvedTags);
      }

      await updatePhoto.mutateAsync({ id: editPhotoId, updates: savePayload });
      
      invalidateDetail(editPhotoId);
      invalidateList();
      invalidateTags();
      queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', editPhotoId] });
      
      return rawResult;
    },
    onSuccess: () => {
      feedback.success(t('aiAnalyzeSuccessSimple') || '識別成功');
    },
    onError: (err) => {
      ErrorFactory.handle(err as Error, { context: 'AI Analysis' });
      feedback.error(t('aiAnalyzeFailed') || '識別失敗');
    }
  });

  const onAnalyze = useCallback(async (previewSrc?: string, imageUrl?: string) => {
    const url = previewSrc || imageUrl;
    if (!url) return false;
    await handleAiAnalyze({ imageUrl: url });
    return true;
  }, [handleAiAnalyze]);

  const handleReExtract = useCallback(async (rawResult?: unknown) => {
    if (!editPhotoId) {
      feedback.error('缺少照片 ID，无法重新提取');
      return;
    }
    setIsReExtracting(true);
    try {
      let parsed: unknown = rawResult;
      
      // 如果没有直接传入 rawResult，尝试从后端获取
      if (!parsed) {
        const serverData = await AIService.reExtract(editPhotoId);
        parsed = serverData?.rawResult || serverData;
      }

      if (!parsed) {
        feedback.error('未找到可用于提取的 AI RAW 原始数据');
        return;
      }

      if (typeof parsed === 'string') {
        const cleanRaw = parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanRaw);
      }
      
      const updates = await mapAnalysisToUpdates(parsed as import('#src/features/ai/orchestration.js').PhotoAnalysisResponse, allTags, categories);
      
      if (updates.resolvedTagIds) {
        const resolvedTagIds = updates.resolvedTagIds as Array<string | number>;
        const resolvedTags = resolvedTagIds.map((id: number | string) => allTags.find(t => String(t.id) === String(id))).filter((t): t is Tag => !!t);
        form.setFieldValue('tags', resolvedTags);
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (!['unresolvedTagNames', 'resolvedTagIds'].includes(key)) {
          form.setFieldValue(key as keyof PhotoEditFormData, value as never);
        }
      });

      const savePayload = {
        ...updates,
        tags: updates.resolvedTagIds || updates.tags,
      };

      await updatePhoto.mutateAsync({ id: editPhotoId, updates: savePayload });
      invalidateDetail(editPhotoId);
      invalidateList();
      invalidateTags();
      queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', editPhotoId] });
      feedback.success(t('reExtractSuccess') || '重新提取成功');
    } catch (e) {
      ErrorFactory.handle(e as Error, { context: 'AI Re-extraction' });
      feedback.error(t('saveDataFailed') || '提取失敗');
    } finally {
      setIsReExtracting(false);
    }
  }, [editPhotoId, allTags, categories, form, updatePhoto, invalidateDetail, invalidateList, invalidateTags, t]);

  return { handleAiAnalyze: onAnalyze, handleReExtract, isAnalyzing, isReExtracting };
}
