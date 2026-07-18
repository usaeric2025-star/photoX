import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { userAtom } from '#src/store/atoms/auth/authAtoms.js';
import { useAppQuery, useAppMutation, useQueryClient } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { executeTask, createTask, Task, TaskState } from '#lib/task-queue/index.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/index.js';
import { perfAudit, PerfIncident } from '#lib/perfAudit.js';
import { ISSUE_ACTIONS, PreviewResult } from "#src/features/diagnostics/issueActions.js";
import { useLocation } from 'wouter';
import { tasksAtom } from '#src/lib/task-queue/taskStore.js';
import { queryKeys } from '#lib/query/keys.js';
import { QueryClient } from '@tanstack/react-query';
import { logger } from '#lib/logger.js';
import { usePhotoMutations, useAIBatchAnalysis } from '#src/hooks/photo/index.js';
import { useSelectedIds } from '#src/hooks/selection/useSelection.js';

type UnifiedTaskStatus = TaskState['status'] | 'queued';

/**
 * AdminService
 * 處理管理員相關的複雜業務邏輯。
 */
const AdminService = {
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
function usePerformanceAudit() {
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

/**
 * useSystemMaintenance
 * 處理系統診斷、修復與維護任務。
 */
function useSystemMaintenance() {
  const { t, uiTranslations: labels } = useTranslation();
  const { invalidateList } = useInvalidatePhotos();

  const { data: auditResult, isFetching: isAuditing, refetch: runAuditQuery } = useAppQuery(
    ['admin', 'maintenance', 'audit'],
    async () => ErrorFactory.unwrap<unknown>(api.admin.maintenance.storage.audit.$get(), labels.storageAuditFailed),
    { 
      staleTime: STALE_TIMES.SHORT * 5,
      enabled: false 
    }
  );

  const runAudit = async () => {
    return executeTask({
      label: labels.storageAuditComplete,
      type: 'repair',
      execute: async (signal, onProgress) => {
        onProgress(0, labels.diagnosing);
        const data = await runAuditQuery();
        onProgress(1, labels.storageAuditComplete);
        return data;
      }
    });
  };

  const { isPending: isDeduplicating, mutate: deduplicate } = useAppMutation({
    mutationFn: async () => {
      return executeTask({
        label: t('deduplicateComplete', 0).split('!')[0],
        type: 'repair',
        execute: async (signal, onProgress) => {
          onProgress(0, labels.processing);
          const data = await ErrorFactory.unwrap<unknown>(api.admin.maintenance.storage.deduplicate.$post(), labels.mutationFailed);
          invalidateList();
          onProgress(1, t('deduplicateComplete', 0));
          return data;
        }
      });
    }
  });

  const runDailyCleanup = async () => {
    return executeTask({
      label: labels.systemMaint,
      type: 'repair',
      execute: async (signal, onProgress) => {
        onProgress(0, labels.processing);
        const data = await ErrorFactory.unwrap<unknown>(api.admin.maintenance['daily-cleanup'].$post(), labels.mutationFailed);
        onProgress(1, labels.diagHealthy);
        return data;
      }
    });
  };

  return {
    auditResult: auditResult || null,
    isAuditing,
    runAudit,
    deduplicate,
    isDeduplicating,
    runDailyCleanup
  };
}

/**
 * useMaintenanceExecution
 * 執行特定的維護任務。
 */
export function useMaintenanceExecution(issueId: string, title: string, onSuccess?: () => void) {
  const { t } = useTranslation();
  const user = useAtomValue(userAtom);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);

  const action = ISSUE_ACTIONS[issueId];

  const handlePreview = async () => {
    if (!action) return;
    setIsPreviewing(true);
    try {
      const result = await action.preview?.();
      setPreview(result || null);
      if (result && result.affectedPhotos && result.affectedPhotos.length > 0) {
        setShowPreviewDialog(true);
      }
    } catch (e: unknown) {
      ErrorFactory.handle(e, { context: t('previewAction') });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = () => {
    setIsExecuting(true);
    setProgress(0);
    
    createTask({
      type: 'repair',
      label: title,
      userId: user?.id,
      execute: async (signal, onProgress) => {
        const update = (p: number, msg?: string) => {
          onProgress(p, msg);
          setProgress(p * 100);
        };
        update(0.1, t('initializing'));
        const result = await action.execute(update);
        update(1, t('completed'));
        return result;
      },
      onComplete: () => {
        setIsExecuting(false);
        setPreview(null);
        setProgress(0);
        if (onSuccess) onSuccess();
      },
      onError: () => {
        setIsExecuting(false);
      }
    });
  };

  return {
    preview, setPreview,
    showPreviewDialog, setShowPreviewDialog,
    isExecuting, isPreviewing, progress,
    handlePreview, handleExecute, action
  };
}

/**
 * useGlobalTasks
 * 整合並追蹤所有全局任務（本地與遠端）。
 */
interface UnifiedTask {
  id: string;
  source: 'session' | 'maintenance';
  title: string;
  status: UnifiedTaskStatus;
  progress: number;
  message?: string;
  createdAt: number;
  processed?: number;
  total?: number;
  jobId?: string;
}

export function useGlobalTasks() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const sessionTasksMap = useAtomValue(tasksAtom);

  // 2. Remote Maintenance Jobs (from backend jobs table)
  const { data: remoteJobs, isPending: isPendingJobs, refetch: refetchJobs } = useAppQuery(
    ['admin', 'tasks', 'remote'],
    async () => {
      // @ts-ignore - Hono client indexing
      const res = await api.admin.maintenance.jobs.$get();
      return ErrorFactory.unwrap<any[]>(res, t('taskFetchFailed'));
    },
    {
      refetchInterval: (rJobs) => {
        const hasRunning = Array.isArray(rJobs) && (rJobs as { status?: string }[]).some(job => job && job.status === 'processing');
        const isStatusScreen = location.startsWith('/admin/tasks') || 
                               location.startsWith('/admin/diagnose') || 
                               location.startsWith('/admin/error-logs');
        return (hasRunning || isStatusScreen) ? 5000 : false;
      },
    }
  );

  // 3. Adapter Logic: Transform to UnifiedTask
  const aggregatedTasks: UnifiedTask[] = [];

  // Map Session Tasks
  sessionTasksMap?.forEach((zt: Task) => {
    let status: UnifiedTaskStatus = 'processing';
    if (zt.state.status === 'completed') status = 'completed';
    if (zt.state.status === 'failed' || zt.state.status === 'cancelled') status = 'failed';
    if (zt.state.status === 'queued') status = 'queued';
    
    aggregatedTasks.push({
      id: zt.id,
      source: 'session', 
      title: zt.label,
      status,
      progress: ((zt.state as any).progress || 0) * 100,
      message: (zt.state as any).message || (zt.state.status === 'failed' ? zt.state.error : ''),
      createdAt: zt.createdAt,
    });
  });

  // Map Remote Jobs
  const safeRemoteJobs = Array.isArray(remoteJobs) ? remoteJobs : [];
  safeRemoteJobs.forEach(rj => {
    if (!rj?.id) return;
    
    let status: UnifiedTaskStatus = 'processing';
    if (rj.status === 'completed') status = 'completed';
    if (rj.status === 'failed') status = 'failed';
    if (rj.status === 'pending') status = 'queued';
    if (rj.status === 'processing') status = 'processing';
    
    const timestampPart = rj.id.split('_').pop();
    const parsedTime = parseInt(timestampPart || Date.now().toString());

    aggregatedTasks.push({
      id: rj.id,
      source: 'maintenance',
      title: rj.id.startsWith('sync') ? t('taskSyncCount') : 
             rj.id.startsWith('backfill') ? t('taskHashFill') : 
             rj.id.startsWith('restore') ? t('taskOrphanExport') : t('taskSystemMaint'),
      status,
      progress: rj.progress || 0,
      processed: rj.processed,
      total: rj.total,
      message: rj.message || rj.error,
      createdAt: Number.isNaN(parsedTime) ? Date.now() : parsedTime,
      jobId: rj.id
    });
  });

  // Sort by updated time (newest first)
  aggregatedTasks.sort((a, b) => b.createdAt - a.createdAt);

  return {
    tasks: aggregatedTasks,
    isPending: isPendingJobs,
    refetch: refetchJobs
  };
}
