import { useCallback } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useAIBatchAnalysis } from '../photo/useAIBatchAnalysis';
import { logger } from '@/lib/logger';
import { showToast } from '@/lib/ui/toast';

export function useAdminBatchActions() {
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  
  const handleBatchAiIdentifyTrigger = async (allPhotos?: any[], ids?: string[]) => {
    const selectedIds = ids || useUIStore.getState().selectedIds;
    
    // If no specific photos provided, we use the passed allPhotos
    let photosToProcess = allPhotos || [];
    
    if (photosToProcess.length === 0) {
      showToast.error('请选择照片或特定合组进行识别');
      return;
    }

    if (selectedIds.length > 0) {
      const selectedGroupIds = new Set<string>();
      (photosToProcess).forEach((p) => {
        if (selectedIds.includes(p.id) && p.groupId) {
          selectedGroupIds.add(p.groupId);
        }
      });
      const groupIdsArray = Array.from(selectedGroupIds);

      const targetPhotos = (photosToProcess).filter((p) => 
        selectedIds.includes(p.id) || (p.groupId && groupIdsArray.includes(p.groupId))
      );
      handleBatchAiAnalyze(targetPhotos);
    } else {
      handleBatchAiAnalyze(photosToProcess);
    }
  };

  return {
    handleBatchAiIdentifyTrigger
  };
}
