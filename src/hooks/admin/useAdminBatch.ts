import { useCallback } from 'react';
import { useUI } from '#lib/store/index.js';
import { useAIBatchAnalysis } from '#src/hooks/photo/usePhotoAI.js';
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useSelectedIds } from '../../services/selection/selectionService.js';
import { useQueryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { useTranslation } from '#src/hooks/index.js';

export function useAdminBatchActions() {
  const { t } = useTranslation();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const selectedIds = useSelectedIds();
  const queryClient = useQueryClient();
  
  const handleBatchAiIdentifyTrigger = async (allPhotos?: { id: string; name?: string; description?: string; imageUrl?: string; thumbnailUrl?: string; groupId?: string | null }[], ids?: string[]) => {
    const targetIds = ids || selectedIds;

    // If no specific photos provided, we use the passed allPhotos
    let photosToProcess = Array.isArray(allPhotos) ? allPhotos : [];
    
    if (photosToProcess.length === 0) {
      // Attempt to retrieve from query client cache to prevent errors when header photos list is not loaded yet
      try {
        const cachedQueries = queryClient.getQueriesData({ queryKey: queryKeys.photos.all });
        const foundPhotos = new Map<string, Record<string, unknown>>();
        for (const [_, data] of cachedQueries) {
          if (!data) continue;
          const typedData = data as Record<string, unknown>;
          if (typeof data === 'object' && 'pages' in typedData && Array.isArray(typedData.pages)) {
            for (const page of typedData.pages as Record<string, unknown>[]) {
              const items = (page.items || page.data || []) as Record<string, unknown>[];
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && typeof item.id === 'string') foundPhotos.set(item.id, item);
                }
              }
            }
          } else if (Array.isArray(data)) {
            for (const item of data as Record<string, unknown>[]) {
              if (item && typeof item.id === 'string') foundPhotos.set(item.id, item);
            }
          } else if (typeof data === 'object' && 'id' in typedData) {
            if (typeof typedData.id === 'string') foundPhotos.set(typedData.id, typedData);
          }
        }
        photosToProcess = Array.from(foundPhotos.values()) as unknown as { id: string; name?: string; description?: string; imageUrl?: string; thumbnailUrl?: string; groupId?: string | null }[];
      } catch (err) {
        logger.error('Failed to retrieve photos from query client cache:', err);
      }
    }
    
    if (photosToProcess.length === 0) {
      ErrorFactory.handle(t('selectPhotosToIdentify'), { context: t('batchAction') });
      return;
    }

    if (targetIds.length > 0) {
      const selectedGroupIds = new Set<string>();
      (photosToProcess).forEach((p) => {
        if (targetIds.includes(p.id) && p.groupId) {
          selectedGroupIds.add(p.groupId);
        }
      });
      const groupIdsArray = Array.from(selectedGroupIds);

      const targetPhotos = (photosToProcess).filter((p) => 
        targetIds.includes(p.id) || (p.groupId && groupIdsArray.includes(p.groupId))
      );
      handleBatchAiAnalyze(targetPhotos as unknown as import('#src/types/index.js').Photo[]);
    } else {
      handleBatchAiAnalyze(photosToProcess as unknown as import('#src/types/index.js').Photo[]);
    }
  };

  return {
    handleBatchAiIdentifyTrigger
  };
}
