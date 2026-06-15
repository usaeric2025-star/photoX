import { useCallback } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { useAIBatchAnalysis } from '../photo';
import { Photo } from '@/types';

export function useAdminBatchActions() {
  const { photos } = usePhotoGallery();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  
  const handleBatchAiIdentifyTrigger = async (ids?: string[]) => {
    const selectedIds = ids || useUIStore.getState().selectedIds;
    
    if (selectedIds.length > 0) {
      const selectedGroupIds = new Set<string>();
      photos.forEach((p: any) => {
        if (selectedIds.includes(p.id) && p.group_id) {
          selectedGroupIds.add(p.group_id);
        }
      });
      const groupIdsArray = Array.from(selectedGroupIds);

      const targetPhotos = photos.filter((p: any) => 
        selectedIds.includes(p.id) || (p.group_id && groupIdsArray.includes(p.group_id))
      );
      handleBatchAiAnalyze(targetPhotos);
    } else {
      handleBatchAiAnalyze(photos);
    }
  };

  return {
    handleBatchAiIdentifyTrigger
  };
}
