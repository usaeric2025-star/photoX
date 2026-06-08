import { useEffect, useMemo, useState } from 'react';
import { useTasks } from '../useTasks';
import { UnifiedTask, TaskStatus } from '@/types';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

/**
 * Adapter hook to aggregate frontend local tasks and backend maintenance jobs.
 */
export function useGlobalTasks() {
  // 1. Frontend Tasks (Real-time, transient)
  const { tasks: localTasks } = useTasks();

  // 2. Backend Jobs (Durable, polled)
  const { data: remoteJobs, refetch: refetchJobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['maintenance-jobs'],
    queryFn: async () => {
      const res = await api.admin.maintenance.jobs.$get();
      return await res.json() as any[];
    },
    refetchInterval: 3000, // Poll every 3 seconds if active
  });

  // 3. Adapter Logic: Transform to UnifiedTask
  const aggregatedTasks = useMemo(() => {
    const unified: UnifiedTask[] = [];

    // Map Local Tasks
    localTasks.forEach(lt => {
      let status: TaskStatus = 'processing';
      if (lt.status === 'completed') status = 'completed';
      if (lt.status === 'error' || lt.status === 'cancelled') status = 'failed';

      unified.push({
        id: lt.id,
        source: 'session', 
        title: lt.name,
        status,
        progress: lt.progress || 0,
        message: lt.message,
        createdAt: Date.now(),
      });
    });

    // Map Remote Jobs
    if (remoteJobs) {
      remoteJobs.forEach(rj => {
        let status: TaskStatus = 'processing';
        if (rj.status === 'completed') status = 'completed';
        if (rj.status === 'failed') status = 'failed';

        // Fix parse int for Date.now 
        const timestampPart = rj.id.split('_').pop();
        const parsedTime = parseInt(timestampPart || Date.now().toString());

        unified.push({
          id: rj.id,
          source: 'maintenance',
          title: rj.id.startsWith('sync') ? '计数值同步' :
                 rj.id.startsWith('backfill') ? '哈希补全' :
                 rj.id.startsWith('restore') ? '孤儿照片导出' : '系统维护',
          status,
          progress: rj.progress || 0,
          processed: rj.processed,
          total: rj.total,
          message: rj.message || rj.error,
          createdAt: Number.isNaN(parsedTime) ? Date.now() : parsedTime,
          jobId: rj.id
        });
      });
    }

    // Sort by updated time (newest first)
    return unified.sort((a, b) => b.createdAt - a.createdAt);
  }, [localTasks, remoteJobs]);

  return {
    tasks: aggregatedTasks,
    isLoading: isLoadingJobs,
    refetch: refetchJobs
  };
}
