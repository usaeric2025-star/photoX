import { useCallback } from 'react';
import { useUI } from '#lib/store/index.js';
import { useAIBatchAnalysis } from '#src/hooks/photo/useAIBatchAnalysis.js';
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useSelectedIds } from '#src/hooks/index.js';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '#lib/query/keys.js';

export function useAdminBatchActions() {
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
        const foundPhotos = new Map<string, any>();
        for (const [_, data] of cachedQueries) {
          if (!data) continue;
          if (typeof data === 'object' && 'pages' in data && Array.isArray((data as any).pages)) {
            for (const page of (data as any).pages) {
              const items = page.items || page.data || [];
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && item.id) foundPhotos.set(item.id, item);
                }
              }
            }
          } else if (Array.isArray(data)) {
            for (const item of data) {
              if (item && item.id) foundPhotos.set(item.id, item);
            }
          } else if (typeof data === 'object' && 'id' in data) {
            const item = data as any;
            foundPhotos.set(item.id, item);
          }
        }
        photosToProcess = Array.from(foundPhotos.values());
      } catch (err) {
        logger.error('Failed to retrieve photos from query client cache:', err);
      }
    }
    
    if (photosToProcess.length === 0) {
      ErrorFactory.handle('请选择照片或特定合组进行识别', { context: '批量操作' });
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
