import { useCallback } from 'react';
import { useUI } from '#lib/store/index.js';
import { useAIBatchAnalysis } from '#src/hooks/photo/useAIBatchAnalysis.js';
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useSelectedIds } from '#src/hooks/index.js';

export function useAdminBatchActions() {
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const selectedIds = useSelectedIds();
  
  const handleBatchAiIdentifyTrigger = async (allPhotos?: { id: string; name?: string; description?: string; imageUrl?: string; thumbnailUrl?: string; groupId?: string | null }[], ids?: string[]) => {
    const targetIds = ids || selectedIds;

    
    // If no specific photos provided, we use the passed allPhotos
    let photosToProcess = allPhotos || [];
    
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
