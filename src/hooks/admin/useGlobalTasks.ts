import { STALE_TIMES } from '@/lib/query/config';
import { useAuth, tasksSignal, useSignal } from '@/lib/store';
import { useEffect, useState } from 'react';
import { UnifiedTask, TaskStatus } from '@/types';
import { api } from '@/lib/api';
import { useAppQuery } from '@/lib/query';
import { useAdminMode } from '@/hooks/core/auth/useAdminMode';
import { logger } from '@/lib/logger';
import { useAppRoute } from '@/lib/router';
import type { Task } from '@/lib/task-queue/types';

/**
 * Adapter hook to aggregate frontend local tasks and backend maintenance jobs.
 */
export function useGlobalTasks() {
  const isAdminPath = useAdminMode();
  const { user } = useAuth();
  const isAdmin = isAdminPath && !!user;
  const route = useAppRoute();
  const routeName = route?.name;
  
  // 1. Frontend Tasks (Real-time, transient)
  const sessionTasksMap = useSignal(tasksSignal);

  // 2. Backend Jobs (Durable, polled)
  const { data: remoteJobs = [], mutate: refetchJobs, isLoading: isPendingJobs } = useAppQuery(
    isAdmin ? ['maintenance-jobs'] : null,
    async () => {
      try {
        const res = await api.admin.maintenance.jobs.$get();
        if (res.status === 401) {
          logger.warn('Unauthorized jobs fetch - likely session expired');
          return [];
        }
        if (!res.ok) return [];
        const result = await res.json() as { success: boolean; data?: { id: string; status: string; progress: number; processed?: number; total?: number; message?: string; error?: string }[] };
        return (result && result.success && Array.isArray(result.data)) ? result.data : [];
      } catch (err) {
        logger.error('Failed to fetch maintenance jobs:', err);
        return [];
      }
    },
    {
      revalidateOnFocus: false, // Prevent focus changes from hammering the server
      revalidateOnReconnect: false,   // Prevent network state changes from refetching
      // Poll only if there is an active job or the user is on a tasks/logs/diagnostics screen
      refreshInterval: (rJobs: unknown) => {
        if (!isAdmin) return 0;
        if (typeof document !== 'undefined' && document.hidden) return 0;
        const hasRunning = Array.isArray(rJobs) && (rJobs as { status?: string }[]).some(job => job && job.status === 'processing');
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const isStatusScreen = 
          (typeof routeName === 'string' && ['adminTasks', 'adminDiagnostics', 'adminDiagnosticsLogs'].includes(routeName)) ||
          pathname.startsWith('/admin/tasks') ||
          pathname.startsWith('/admin/diagnose') ||
          pathname.startsWith('/admin/error-logs');
        return (hasRunning || isStatusScreen) ? 5000 : 0;
      },
      dedupingInterval: STALE_TIMES.FAST
    }
  );

  // 4. Adapter Logic: Transform to UnifiedTask
  const aggregatedTasks: UnifiedTask[] = [];

  // Map Session Tasks
  sessionTasksMap.forEach((zt: Task) => {
    let status: TaskStatus = 'processing';
    if (zt.state.status === 'completed') status = 'completed';
    if (zt.state.status === 'failed' || zt.state.status === 'cancelled') status = 'failed';

    aggregatedTasks.push({
      id: zt.id,
      source: 'session', 
      title: zt.label,
      status,
      progress: ((zt.state as { progress?: number }).progress || 0) * 100,
      message: (zt.state as { message?: string }).message || (zt.state.status === 'failed' ? zt.state.error : ''),
      createdAt: zt.createdAt,
    });
  });

  // Map Remote Jobs
  const safeRemoteJobs = Array.isArray(remoteJobs) ? remoteJobs : [];
  safeRemoteJobs.forEach(rj => {
    if (!rj?.id) return;
    let status: TaskStatus = 'processing';
    if (rj.status === 'completed') status = 'completed';
    if (rj.status === 'failed') status = 'failed';

    // Fix parse int for Date.now 
    const timestampPart = rj.id.split('_').pop();
    const parsedTime = parseInt(timestampPart || Date.now().toString());

    aggregatedTasks.push({
      id: rj.id,
      source: 'maintenance',
      title: rj.id.startsWith('sync') ? '计数值同步' :
             rj.id.startsWith('backfill') ? '哈希补全' :
             rj.id.startsWith('restore') ? '孤兒照片導出' : '系统维护',
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
