import { useMemo } from 'react';
import { useQueryClient } from '#lib/query/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/index.js';
import { perfAudit, PerfIncident } from '#lib/perfAudit.js';
import { queryKeys } from '#lib/query/keys.js';
import { QueryClient } from '@tanstack/react-query';
import { usePhotoMutations, useAIBatchAnalysis } from '#src/hooks/photo/index.js';
import { useSelectedIds } from '#src/hooks/selection/useSelection.js';
import { useSystemMaintenance } from './useSystemMaintenance.js';

/**
 * AdminService
 * 處理管理員相關的複雜業務邏輯。
 */
export const AdminService = {
  getAllCachedPhotos: (queryClient: QueryClient) => {
    try {
      const cachedQueries = queryClient.getQueriesData({ queryKey: queryKeys.photos.all });
      const foundPhotos = new Map<string, any>();
            
      for (const [_, data] of cachedQueries) {
        if (!data) continue;
        const typedData = data as any;
        if (typeof data === 'object' && 'pages' in typedData && Array.isArray(typedData.pages)) {
          for (const page of typedData.pages) {
            const items = (page.items || page.data || []) as any[];
            for (const item of items) {
              if (item && typeof item.id === 'string') foundPhotos.set(item.id, item);
            }
          }
        } 
        else if (Array.isArray(data)) {
          for (const item of data) {
            if (item && typeof item.id === 'string') foundPhotos.set(item.id, item);
          }
        }
        else if (typeof data === 'object' && typedData.id) {
          foundPhotos.set(typedData.id, typedData);
        }
      }
      return Array.from(foundPhotos.values());
    } catch (err) {
      ErrorFactory.handle(err, { context: '[AdminService] Failed to retrieve photos from cache', silent: true });
      return [];
    }
  },
  filterPhotosWithGroups: (allPhotos: any[], targetIds: string[]) => {
    if (targetIds.length === 0) return allPhotos;
    const selectedGroupIds = new Set<string>();
    const targetIdSet = new Set(targetIds.map(id => String(id)));
    allPhotos.forEach((p) => {
      if (targetIdSet.has(String(p.id)) && p.groupId) {
        selectedGroupIds.add(String(p.groupId));
      }
    });
    return allPhotos.filter((p) => 
      targetIdSet.has(String(p.id)) || (p.groupId && selectedGroupIds.has(String(p.groupId)))
    );
  }
};

/**
 * useAdminActions
 * 整合管理員的核心操作 Hook (Facade)。
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

  const handleBatchAiIdentifyTrigger = async (allPhotos?: any[], ids?: string[]) => {
    const targetIds = ids || selectedIds;
    let photosToProcess = Array.isArray(allPhotos) ? allPhotos : AdminService.getAllCachedPhotos(queryClient);
    if (photosToProcess.length === 0) {
      ErrorFactory.handle(t('selectPhotosToIdentify') || 'Select photos to identify', { context: 'batchAction' });
      return;
    }
    const filteredPhotos = AdminService.filterPhotosWithGroups(photosToProcess, targetIds);
    handleBatchAiAnalyze(filteredPhotos as any);
  };

  return {
    updatePhoto: editMutation,
    deletePhoto: deleteMutation,
    batchUpdate: batchEditMutation,
    togglePin: togglePinMutation,
    handleBatchAiIdentifyTrigger,
    handleBatchAiAnalyze,
    auditResult,
    isAuditing,
    runAudit,
    runRepair: async (id: string) => {
      if (id === 'deduplicate') return deduplicate({});
      throw new Error('Unsupported repair action');
    },
    runDailyCleanup,
    performanceIssues,
    clearAudits,
    refreshReport: invalidateAll
  };
}

/**
 * usePerformanceAudit
 * 獲取並格式化前端性能審計結果。
 */
export function usePerformanceAudit() {
  const { t } = useTranslation();
  const performanceIssues = useMemo(() => {
    const incidents = perfAudit.getIncidents();
    const issues: any[] = [];
    const grouped = incidents.reduce((acc, curr) => {
      if (!acc[curr.label]) acc[curr.label] = [];
      acc[curr.label].push(curr);
      return acc;
    }, {} as Record<string, PerfIncident[]>);
    Object.entries(grouped).forEach(([label, list]: [string, PerfIncident[]]) => {
      if (list.length > 5) {
        const avgDuration = list.reduce((a: number, b: PerfIncident) => a + b.duration, 0) / list.length;
        const maxDuration = Math.max(...list.map((i: PerfIncident) => i.duration));
        issues.push({
          id: `perf_${label}`,
          category: 'performance',
          severity: 'P2',
          title: t('perfAuditTitle', label),
          description: t('perfAuditDesc', label, avgDuration.toFixed(2), maxDuration.toFixed(2)),
          affectedCount: list.length,
          autoFixable: true,
          actionName: t('clearAudit'),
          isClientOnly: true
        });
      }
    });
    return issues;
  }, [t]);

  return {
    performanceIssues,
    clearAudits: perfAudit.clear
  };
}
