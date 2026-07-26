import { useMemo, useState } from 'react';
import { useQueryClient, useAppQuery, useAppMutation } from '#lib/query/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/index.js';
import { perfAudit, PerfIncident } from '#lib/perfAudit.js';
import { queryKeys } from '#lib/query/keys.js';
import { QueryClient } from '@tanstack/react-query';
import { usePhotoMutations, useAIBatchAnalysis } from '#src/hooks/photo/index.js';
import { useSelectedIds } from '#src/hooks/index.js';
import { useAtomValue } from 'jotai';
import { userAtom } from '#src/store/index.js';
import { api } from '#lib/api.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { executeTask, createTask } from '#lib/task-queue/index.js';
import { ISSUE_ACTIONS, PreviewResult } from "#src/features/diagnostics/issueActions.js";
import { useLocation } from 'react-router-dom';
import { tasksAtom } from '#src/lib/task-queue/taskStore.js';
import { Task, TaskState } from '#lib/task-queue/index.js';
import { feedback } from '#src/lib/feedback.js';

/**
 * AdminService
 * 處理管理員相關的複雜業務邏輯。
 */
export const AdminService = {
  getAllCachedPhotos: (queryClient: QueryClient) => {
    try {
      const cachedQueries = queryClient.getQueriesData({ queryKey: queryKeys.photos.all });
      const foundPhotos = new Map<string, { id: string; [key: string]: unknown }>();
            
      for (const [_, data] of cachedQueries) {
        if (!data) continue;
        const typedData = data as { 
          pages?: Array<{ items?: Array<{ id: string }>; data?: Array<{ id: string }> }>; 
          items?: Array<{ id: string }>; 
          data?: Array<{ id: string }>;
          id?: string;
        };
        
        if (typedData.pages && Array.isArray(typedData.pages)) {
          for (const page of typedData.pages) {
            const items = (page.items || page.data || []) as Array<{ id: string }>;
            for (const item of items) {
              if (item && typeof item.id === 'string') foundPhotos.set(item.id, item as { id: string; [key: string]: unknown });
            }
          }
        } 
        else if (Array.isArray(data)) {
          for (const item of data) {
            if (item && typeof item.id === 'string') foundPhotos.set(item.id, item as { id: string; [key: string]: unknown });
          }
        }
        else if (typeof typedData === 'object' && typedData.id) {
          foundPhotos.set(typedData.id, typedData as { id: string; [key: string]: unknown });
        }
      }
      return Array.from(foundPhotos.values());
    } catch (err) {
      ErrorFactory.handle(err as Error, { context: '[AdminService] Failed to retrieve photos from cache', silent: true });
      return [];
    }
  },
  filterPhotosWithGroups: (allPhotos: { id: string; groupId?: string | null }[], targetIds: string[]) => {
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
  const { editMutation, deleteMutation, batchEditMutation, manualGroupMutation, togglePinMutation, isGrouping } = usePhotoMutations();
  const { handleBatchAiAnalyze, isAiAnalyzing } = useAIBatchAnalysis();
  const selectedIds = useSelectedIds();
  const queryClient = useQueryClient();
  const { auditResult, isAuditing, runAudit, deduplicate, runDailyCleanup } = useSystemMaintenance();
  const { performanceIssues, clearAudits } = usePerformanceAudit();

  const handleBatchAiIdentifyTrigger = async (allPhotos?: { id: string; groupId?: string | null }[], ids?: string[]) => {
    const targetIds = ids || selectedIds;
    let photosToProcess = Array.isArray(allPhotos) && allPhotos.length > 0 ? allPhotos : AdminService.getAllCachedPhotos(queryClient);

    if (!allPhotos || allPhotos.length === 0) {
      try {
        // @ts-ignore - Hono client indexing
        const res = await api.photos.list.$post({ json: { page: '1', limit: '1000' } });
        const data = await ErrorFactory.unwrap<{ items: Array<{ id: string; groupId?: string | null }> }>(res, 'Fetch Failed');
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          photosToProcess = data.items;
        }
      } catch (err) {
        // Fallback to cached photos if API call fails
      }
    }

    if (photosToProcess.length === 0) {
      ErrorFactory.handle(t('selectPhotosToIdentify') || 'Select photos to identify', { context: 'batchAction' });
      return;
    }
    const filteredPhotos = AdminService.filterPhotosWithGroups(photosToProcess, targetIds);
    
    if (filteredPhotos.length === 0) {
      feedback.info(t('noPhotosToAnalyze') || '沒有需要識別的照片');
      return;
    }

    try {
      await feedback.promise(handleBatchAiAnalyze(filteredPhotos as any), {
        loading: t('aiAnalyzing') || '正在啟動 AI 識別...',
        success: t('aiAnalyzeSuccess') || 'AI 識別任務已啟動',
        error: (err: { message: string }) => `${t('aiAnalyzeFailed') || 'AI 識別失敗'}: ${err.message}`
      });
    } catch (e) {
      // handled by feedback.promise
    }
  };

  return {
    updatePhoto: editMutation,
    deletePhoto: deleteMutation,
    batchUpdate: batchEditMutation,
    manualGroup: manualGroupMutation,
    togglePin: togglePinMutation,
    handleBatchAiIdentifyTrigger,
    handleBatchAiAnalyze,
    isAiAnalyzing,
    isGrouping,
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
 */
export function usePerformanceAudit() {
  const { t } = useTranslation();
  const performanceIssues = useMemo(() => {
    const incidents = perfAudit.getIncidents();
    const issues: Array<{ 
      id: string; 
      category: string; 
      severity: string; 
      title: string; 
      description: string; 
      affectedCount: number; 
      autoFixable: boolean; 
      actionName: string; 
      isClientOnly: boolean; 
    }> = [];
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
 */
export function useSystemMaintenance() {
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

type UnifiedTaskStatus = TaskState['status'] | 'queued';

export interface UnifiedTask {
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

/**
 * useGlobalTasks
 * 整合並追蹤所有全局任務（本地與遠端）。
 */
export function useGlobalTasks() {
  const { t } = useTranslation();
  const locationObj = useLocation();
  const location = locationObj.pathname;
  const sessionTasksMap = useAtomValue(tasksAtom);

  const { data: remoteJobs, isPending: isPendingJobs, refetch: refetchJobs } = useAppQuery(
    ['admin', 'tasks', 'remote'],
    async () => {
      // @ts-ignore - Hono client indexing
      const res = await api.admin.maintenance.jobs.$get();
      return ErrorFactory.unwrap<Record<string, unknown>[]>(res, t('taskFetchFailed'));
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

  const aggregatedTasks: UnifiedTask[] = [];

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
      progress: ((zt.state as TaskState & { progress?: number }).progress || 0) * 100,
      message: (zt.state as TaskState & { message?: string }).message || (zt.state.status === 'failed' ? (zt.state as TaskState & { error?: string }).error : ''),
      createdAt: zt.createdAt,
    });
  });

  const safeRemoteJobs = Array.isArray(remoteJobs) ? remoteJobs : [];
  safeRemoteJobs.forEach((rj: any) => {
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

  aggregatedTasks.sort((a, b) => b.createdAt - a.createdAt);

  return {
    tasks: aggregatedTasks,
    isPending: isPendingJobs,
    refetch: refetchJobs
  };
}
