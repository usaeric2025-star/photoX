import { usePhotoMutations } from '#src/hooks/photo/index.js';
import { useAIBatchAnalysis } from '#src/hooks/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/useInvalidatePhotos.js';
import { useQueryClient } from '#lib/query/index.js';
import { useSelectedIds } from '#src/hooks/selection/useSelection.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useSystemMaintenance } from './useSystemMaintenance.js';
import { usePerformanceAudit } from './usePerformanceAudit.js';
import { AdminService } from './AdminService.js';

/**
 * useAdminActions
 * 
 * 整合管理員的核心操作 Hook (Facade)。
 * 邏輯已抽離至 AdminService 與各領域 Hook。
 */
export function useAdminActions() {
  const { t } = useTranslation();
  const { invalidateAll } = useInvalidatePhotos();
  const { editMutation, deleteMutation, batchEditMutation, togglePinMutation } = usePhotoMutations();
  const { handleBatchAiAnalyze } = useAIBatchAnalysis();
  const selectedIds = useSelectedIds();
  const queryClient = useQueryClient();

  const { auditResult, isAuditing, runAudit, deduplicate, runDailyCleanup } = useSystemMaintenance();
  const { performanceIssues, clearAudits } = usePerformanceAudit();

  /**
   * 批量 AI 識別觸發
   */
  const handleBatchAiIdentifyTrigger = async (
    allPhotos?: any[], 
    ids?: string[]
  ) => {
    const targetIds = ids || selectedIds;
    let photosToProcess = Array.isArray(allPhotos) ? allPhotos : AdminService.getAllCachedPhotos(queryClient);
    
    if (photosToProcess.length === 0) {
      ErrorFactory.handle(t('selectPhotosToIdentify') || 'Select photos to identify', { context: t('batchAction') });
      return;
    }

    const filteredPhotos = AdminService.filterPhotosWithGroups(photosToProcess, targetIds);
    handleBatchAiAnalyze(filteredPhotos as any);
  };

  return {
    // Photos
    updatePhoto: editMutation,
    deletePhoto: deleteMutation,
    batchUpdate: batchEditMutation,
    togglePin: togglePinMutation,
    
    // AI
    handleBatchAiIdentifyTrigger,
    handleBatchAiAnalyze,

    // Maintenance
    auditResult,
    isAuditing,
    runAudit,
    runRepair: async (id: string) => {
        if (id === 'deduplicate') return deduplicate({});
        throw new Error('Unsupported repair action');
    },
    runDailyCleanup,

    // Performance
    performanceIssues,
    clearAudits,
    
    // Refresh Reports
    refreshReport: invalidateAll
  };
}
