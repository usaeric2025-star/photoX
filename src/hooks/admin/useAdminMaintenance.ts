import { usePhotoEditMutation, usePhotoDelete, usePhotoBatchEdit, useTogglePin } from '../photo/usePhotoMutations';
import { useAIBatchAnalysis } from '../photo';

/**
 * useAdminMaintenance
 * 管理員操作的聚合 Hook，提供刪除、更新、批量操作等功能。
 * 替換原有的 features/admin/useAdminActions.ts。
 */
export function useAdminMaintenance() {
  const photoEdit = usePhotoEditMutation();
  const photoDelete = usePhotoDelete();
  const photoBatchUpdate = usePhotoBatchEdit();
  const photoTogglePin = useTogglePin();
  const aiBatch = useAIBatchAnalysis();

  return {
    updatePhoto: photoEdit,
    deletePhoto: photoDelete,
    batchUpdate: photoBatchUpdate,
    togglePin: photoTogglePin,
    handleBatchAiAnalyze: aiBatch.handleBatchAiAnalyze,
    // Add full objects for destructuring compatibility
    photoEdit,
    photoDelete,
    photoBatchUpdate,
    photoTogglePin,
  };
}
