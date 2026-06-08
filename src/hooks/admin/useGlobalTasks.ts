import { useEffect, useMemo, useState } from 'react';
import { useTasks, useAuth } from '../';
import { UnifiedTask, TaskStatus } from '@/types';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useAdminMode } from '../core/auth/useAdminMode';
import { logger } from '@/lib/logger';

/**
 * Adapter hook to aggregate frontend local tasks and backend maintenance jobs.
 */
export function useGlobalTasks() {
  const isAdminPath = useAdminMode();
  const { user } = useAuth();
  const isAdmin = isAdminPath && !!user;
  
  // 1. Frontend Tasks (Real-time, transient)
  const { tasks: localTasks = [] } = useTasks();

  // 2. Backend Jobs (Durable, polled)
  const { data: remoteJobs = [], refetch: refetchJobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['maintenance-jobs'],
    queryFn: async () => {
      if (!isAdmin) return [];
      try {
        const res = await api.admin.maintenance.jobs.$get();
        if (res.status === 401) {
          logger.warn('Unauthorized jobs fetch - likely session expired');
          return [];
        }
        if (!res.ok) return [];
        const result = await res.json() as any;
        return (result && result.success && Array.isArray(result.data)) ? result.data : [];
      } catch (err) {
        console.error('Failed to fetch maintenance jobs:', err);
        return [];
      }
    },
    enabled: isAdmin,
    refetchInterval: isAdmin ? 5000 : false, // Poll every 5 seconds if active
  });

  // 3. Adapter Logic: Transform to UnifiedTask
  const aggregatedTasks = useMemo(() => {
    const unified: UnifiedTask[] = [];

    // Map Local Tasks
    const safeLocalTasks = Array.isArray(localTasks) ? localTasks : [];
    safeLocalTasks.forEach(lt => {
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
    const safeRemoteJobs = Array.isArray(remoteJobs) ? remoteJobs : [];
    safeRemoteJobs.forEach(rj => {
      if (!rj?.id) return;
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
    return unified.sort((a, b) => b.createdAt - a.createdAt);
  }, [localTasks, remoteJobs]);

  return {
    tasks: aggregatedTasks,
    isLoading: isLoadingJobs,
    refetch: refetchJobs
  };
}
