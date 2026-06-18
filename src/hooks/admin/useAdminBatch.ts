import { useCallback } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useAIBatchAnalysis } from '../photo';

export function useAdminBatchActions() {
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  
  const handleBatchAiIdentifyTrigger = async (allPhotos: any[], ids?: string[]) => {
    const selectedIds = ids || useUIStore.getState().selectedIds;
    
    if (selectedIds.length > 0) {
      const selectedGroupIds = new Set<string>();
      (allPhotos).forEach((p) => {
        if (selectedIds.includes(p.id) && p.groupId) {
          selectedGroupIds.add(p.groupId);
        }
      });
      const groupIdsArray = Array.from(selectedGroupIds);

      const targetPhotos = (allPhotos).filter((p) => 
        selectedIds.includes(p.id) || (p.groupId && groupIdsArray.includes(p.groupId))
      );
      handleBatchAiAnalyze(targetPhotos);
    } else {
      handleBatchAiAnalyze(allPhotos);
    }
  };

  return {
    handleBatchAiIdentifyTrigger
  };
}
