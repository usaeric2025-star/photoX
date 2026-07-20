import { useMemo } from 'react';
import { useTranslation } from '#src/hooks/core/index.js';
import { useLocation } from 'wouter';
import { useAtomValue } from 'jotai';
import { tasksAtom } from '#src/lib/task-queue/taskStore.js';
import { useAppQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Task, TaskState } from '#lib/task-queue/index.js';

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
  const [location] = useLocation();
  const sessionTasksMap = useAtomValue(tasksAtom);

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
      progress: ((zt.state as any).progress || 0) * 100,
      message: (zt.state as any).message || (zt.state.status === 'failed' ? zt.state.error : ''),
      createdAt: zt.createdAt,
    });
  });

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

  aggregatedTasks.sort((a, b) => b.createdAt - a.createdAt);

  return {
    tasks: aggregatedTasks,
    isPending: isPendingJobs,
    refetch: refetchJobs
  };
}
