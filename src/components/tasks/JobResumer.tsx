import { useAuthStore } from '@/store/useAuthStore';
import React, { useEffect, useRef } from 'react';
import { useTasks, type BackgroundTask } from '@/hooks';
import { ISSUE_ACTIONS } from "@/features/diagnostics/issueActions";
import { logger } from '@/lib/logger';

/**
 * JobResumer
 * Automatically resumes polling for server-side jobs that were interrupted by a page refresh.
 */
export function JobResumer() {
  const { user } = useAuthStore();
  const { tasks, updateTask } = useTasks();
  // Keep track of active intervals by task id to prevent leaks
  const activeIntervals = useRef<Map<string, NodeJS.Timeout | number>>(new Map());

  useEffect(() => {
    if (!user) {
      // Clear all active intervals on sign out
      activeIntervals.current.forEach((intervalId) => {
        clearInterval(intervalId as any);
      });
      activeIntervals.current.clear();
      return;
    }

    const safeTasks = Array.isArray(tasks) ? tasks : [];

    // Find tasks that are 'running', have a 'jobId' and 'issueId', but are NOT currently being polled
    const interruptedJobs = safeTasks.filter((t: BackgroundTask) => 
      t.status === 'running' && 
      t.jobId && 
      t.issueId && 
      !activeIntervals.current.has(t.id)
    );

    interruptedJobs.forEach((task: BackgroundTask) => {
      const { id, jobId, issueId, name } = task;
      if (!jobId || !issueId) return;

      const action = ISSUE_ACTIONS[issueId];
      if (!action || !action.getStatus) {
        // If we can't poll, mark as failed
        updateTask(id, { status: 'error', message: '无法恢复轮詢：未定义的動作或獲取狀態函數' });
        return;
      }

      logger.info(`[JobResumer] Resuming polling for task: ${name} (Job: ${jobId})`);

      // Start polling and register in map
      const interval = setInterval(async () => {
        try {
          const status = await action.getStatus!(jobId);
          
          updateTask(id, { 
            progress: status.progress, 
            message: status.message || task.message 
          });

          if (status.status === 'completed') {
            const currentInt = activeIntervals.current.get(id);
            if (currentInt) {
              clearInterval(currentInt);
              activeIntervals.current.delete(id);
            }
            updateTask(id, { status: 'completed', progress: 100, message: '任务已完成' });
          } else if (status.status === 'failed') {
            const currentInt = activeIntervals.current.get(id);
            if (currentInt) {
              clearInterval(currentInt);
              activeIntervals.current.delete(id);
            }
            updateTask(id, { status: 'error', message: (status as { error?: string }).error || status.message || '任务执行失败' });
          }
        } catch (e: unknown) {
          logger.error(`[JobResumer] Polling error for ${jobId}:`, e);
        }
      }, 3000);

      activeIntervals.current.set(id, interval);
    });

    // Clean up active interval mappings for tasks that are no longer running
    activeIntervals.current.forEach((intervalId, id) => {
      const task = safeTasks.find(t => t.id === id);
      if (!task || task.status !== 'running') {
        clearInterval(intervalId);
        activeIntervals.current.delete(id);
        logger.info(`[JobResumer] Cleared stale polling interval for task ID: ${id}`);
      }
    });
  }, [tasks, updateTask, user]);

  // Clean up all active intervals when the Component unmounts
  useEffect(() => {
    return () => {
      activeIntervals.current.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      activeIntervals.current.clear();
    };
  }, []);

  return null;
}
