import { usePhotoMutations } from '#src/hooks/photo/usePhotoMutations.js';
import { useAIBatchAnalysis } from '#src/hooks/photo/useAIBatchAnalysis.js';

/**
 * useAdminMaintenance
 * 管理員操作的聚合 Hook，提供刪除、更新、批量操作等功能。
 * 替換原有的 features/admin/useAdminActions.ts。
 */
export function useAdminMaintenance() {
  const { editMutation, deleteMutation, batchEditMutation, togglePinMutation } = usePhotoMutations();
  const aiBatch = useAIBatchAnalysis();

  return {
    updatePhoto: editMutation,
    deletePhoto: deleteMutation,
    batchUpdate: batchEditMutation,
    togglePin: togglePinMutation,
    handleBatchAiAnalyze: aiBatch.handleBatchAiAnalyze,
    // Add full objects for destructuring compatibility
    photoEdit: editMutation,
    photoDelete: deleteMutation,
    photoBatchUpdate: batchEditMutation,
    photoTogglePin: togglePinMutation,
  };
}
