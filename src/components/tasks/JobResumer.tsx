import React, { useEffect, useRef } from 'react';
import { useTasks, BackgroundTask } from '@/hooks/useTasks';
import { ISSUE_ACTIONS } from '@/lib/maintenance/issueActions';
import { logger } from '@/lib/logger';

/**
 * JobResumer
 * Automatically resumes polling for server-side jobs that were interrupted by a page refresh.
 */
export function JobResumer() {
  const { tasks, updateTask } = useTasks();
  const pollingJobs = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Find tasks that are 'running', have a 'jobId' and 'issueId', but are NOT currently being polled
    const interruptedJobs = tasks.filter(t => 
      t.status === 'running' && 
      t.jobId && 
      t.issueId && 
      !pollingJobs.current.has(t.id)
    );

    interruptedJobs.forEach(async (task) => {
      const { id, jobId, issueId, name } = task;
      if (!jobId || !issueId) return;

      const action = ISSUE_ACTIONS[issueId];
      if (!action || !action.getStatus) {
        // If we can't poll, mark as unknown/interrupted
        updateTask(id, { status: 'error', message: '无法恢复轮詢：未定义的動作或獲取狀態函數' });
        return;
      }

      logger.info(`[JobResumer] Resuming polling for task: ${name} (Job: ${jobId})`);
      pollingJobs.current.add(id);

      // Start polling
      const interval = setInterval(async () => {
        try {
          const status = await action.getStatus!(jobId);
          
          updateTask(id, { 
            progress: status.progress, 
            message: status.message || task.message 
          });

          if (status.status === 'completed') {
            clearInterval(interval);
            updateTask(id, { status: 'completed', progress: 100, message: '任务已完成' });
            pollingJobs.current.delete(id);
          } else if (status.status === 'failed') {
            clearInterval(interval);
            updateTask(id, { status: 'error', message: status.error || '任务执行失败' });
            pollingJobs.current.delete(id);
          }
        } catch (e: any) {
          logger.error(`[JobResumer] Polling error for ${jobId}:`, e);
          // Don't clear interval immediately, maybe it's a transient network error
          // But if it persists, we might want to stop
        }
      }, 3000);

      // Cleanup on unmount or if task removed
      return () => {
        clearInterval(interval);
        pollingJobs.current.delete(id);
      };
    });
  }, [tasks, updateTask]);

  return null;
}
