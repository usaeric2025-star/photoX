import { useCallback, useState } from 'react';
import { translateDimensionLabelToEnglish } from '#src/utils/display.js';
import { usePhotoEditSessionContext } from "./PhotoEditSession.js";
import { ErrorFactory } from '#lib/error/index.js';
import { queryClient } from '#lib/query/index.js';
import { executeTask } from '#lib/task-queue/index.js';
import { useAdminActions, useCategories, useTags, useFilters, useTranslation } from '#src/hooks/index.js';
import { Tag } from '#src/types/index.js';
import { useAuth } from '#lib/store/index.js';
import { showToast } from '#lib/ui/toast.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { type PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { useInvalidatePhotos } from '#src/hooks/photo/index.js';
import { AIService } from '../services/AIService.js';

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
  const user = useAuth(s => s.user);
  const { form } = usePhotoEditSessionContext();
  const { modal, photoId: filterPhotoId } = useFilters();
  const editPhotoId = modal === 'edit' ? filterPhotoId : null;
  const { t } = useTranslation();
  const { updatePhoto } = useAdminActions();
  const { invalidateDetail, invalidateList, invalidateTags } = useInvalidatePhotos();
  
  const [isReExtracting, setIsReExtracting] = useState(false);
  const { categories = [] } = useCategories();
  const { tags: allTags = [] } = useTags();

  const { submit: handleAiAnalyze, isLoading: isAnalyzing } = useFormSubmit({
    schema: AIAnalysisSchema,
    mutationFn: async ({ imageUrl }: { imageUrl: string }) => {
      if (!editPhotoId) throw new Error('Missing editPhotoId');
      
      return executeTask({
        label: t('aiAnalyze') || 'AI 識別中',
        type: 'ai-analyze',
        userId: user?.id,
        execute: async (signal, onProgress) => {
          onProgress(0.3, t('aiAnalyzingAttributes') || '正在識別屬性');
          const rawResult = await AIService.analyze({ id: editPhotoId, thumbnailUrl: imageUrl } as any);
          
          onProgress(0.7, t('aiParsingResult') || '正在解析結果');
          const updates = await AIService.parseToUpdates(rawResult, allTags, categories);

          // AI 標籤解析與回填
          if (updates.unresolvedTagNames && Array.isArray(updates.unresolvedTagNames)) {
            const resolvedTags = await AIService.resolveTagNames(updates.unresolvedTagNames as string[], allTags);
            const finalTags = Array.from(new Set([
              ...(updates.resolvedTagIds as string[]).map(id => allTags.find(t => String(t.id) === id)),
              ...resolvedTags
            ])).filter(Boolean) as Tag[];
            updates.tags = finalTags.slice(0, 10);
            invalidateTags();
          }

          // 尺寸翻譯處理
          if (Array.isArray(updates.dimensions)) {
            updates.dimensions = updates.dimensions.map((d: any) => ({
              ...d,
              label: translateDimensionLabelToEnglish(String(d.label || t('dimensions'))),
              unit: (d.unit === 'inch' || d.unit === 'mm') ? d.unit : 'cm',
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

          // 自動保存到後端
          await updatePhoto.mutateAsync({ id: editPhotoId, updates });
          
          invalidateDetail(editPhotoId);
          invalidateList();
          queryClient.invalidateQueries({ queryKey: ['photos', 'ai-result', editPhotoId] });
          
          return rawResult;
        }
      });
    },
    onSuccess: () => {
      showToast.success(t('aiAnalyzeSuccessSimple') || '識別成功');
    },
    onError: (err) => {
      ErrorFactory.handle(err as Error, { context: 'AI Analysis' });
      showToast.error(t('aiAnalyzeFailed') || '識別失敗');
    }
  });

  const onAnalyze = useCallback(async (previewSrc?: string, imageUrl?: string) => {
    const url = previewSrc || imageUrl;
    if (!url) return false;
    await handleAiAnalyze({ imageUrl: url });
    return true;
  }, [handleAiAnalyze]);

  const handleReExtract = useCallback(async (rawResult: unknown) => {
    if (!editPhotoId) return;
    setIsReExtracting(true);
    try {
      let parsed = rawResult as any;
      if (typeof parsed === 'string') {
        const cleanRaw = parsed.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanRaw);
      }
      
      const updates = await AIService.parseToUpdates(parsed, allTags, categories);
      
      if (updates.unresolvedTagNames && Array.isArray(updates.unresolvedTagNames)) {
        const resolvedTags = await AIService.resolveTagNames(updates.unresolvedTagNames as string[], allTags);
        updates.tags = Array.from(new Set([
          ...(updates.resolvedTagIds as any[]).map(id => allTags.find(t => String(t.id) === id)),
          ...resolvedTags
        ])).filter(Boolean).slice(0, 10);
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (!['unresolvedTagNames', 'resolvedTagIds'].includes(key)) {
          form.setFieldValue(key as keyof PhotoEditFormData, value as never);
        }
      });

      await updatePhoto.mutateAsync({ id: editPhotoId, updates });
      invalidateDetail(editPhotoId);
      invalidateList();
      showToast.success(t('reExtractSuccess') || '重新提取成功');
    } catch (e) {
      ErrorFactory.handle(e as Error, { context: 'AI Re-extraction' });
      showToast.error(t('saveDataFailed') || '提取失敗');
    } finally {
      setIsReExtracting(false);
    }
  }, [editPhotoId, allTags, categories, form, updatePhoto, invalidateDetail, invalidateList, t]);

  return { handleAiAnalyze: onAnalyze, handleReExtract, isAnalyzing, isReExtracting };
}
