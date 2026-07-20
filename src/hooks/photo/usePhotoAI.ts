import { useAppMutation, useAppQuery } from '#lib/query/index.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from './usePhotos.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { STALE_TIMES } from '#lib/query/config.js';

/**
 * useAIBatchAnalysis
 */
export function useAIBatchAnalysis() {
  const { t, uiTranslations: labels } = useTranslation();
  const { invalidateList } = useInvalidatePhotos();

  const aiAnalyzeMutation = useAppMutation({
    mutationFn: async (photos: any[]) => {
      return runBatchAnalysis({
        targetPhotos: photos,
        onProgress: () => {} // Progress handled internally or ignored here
      });
    }
  });

  return {
    aiAnalyzeMutation,
    handleBatchAiAnalyze: aiAnalyzeMutation.mutate,
    isAiAnalyzing: aiAnalyzeMutation.isPending
  };
}

/**
 * usePhotoAIResult
 */
export function usePhotoAIResult(photoId: string, options: any = {}) {
  const { t } = useTranslation();
  
  return useAppQuery(
    ['photos', 'ai-result', photoId],
    async () => {
      if (!photoId) return null;
      // @ts-ignore
      const res = await api.admin.photo[':id']['ai-result'].$get({ param: { id: photoId } });
      return ErrorFactory.unwrap<any>(res, t('aiAnalyzeFailed') || 'AI Analysis Failed');
    },
    { 
      enabled: !!photoId && options.enabled !== false,
      staleTime: STALE_TIMES.LONG,
      ...options
    }
  );
}
