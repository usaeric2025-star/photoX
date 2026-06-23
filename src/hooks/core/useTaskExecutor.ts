import { useCallback } from 'react';
import { useTask } from '@/lib/store';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error';
import { hapticFeedback } from '@/lib/ui/haptics';

/**
 * Hook for executing long-running tasks with background progress tracking.
 */
export function useTaskExecutor() {
  const enqueue = useTask(s => s.enqueue);
  const startTask = useTask(s => s.startTask);
  const updateProgressState = useTask(s => s.updateProgress);
  const completeTask = useTask(s => s.completeTask);
  const failTask = useTask(s => s.failTask);

  const runTask = useCallback(async <T,>(
    name: string,
    fn: (ctx: { 
      updateProgress: (pct: number, msg?: string) => void;
      taskId: string | null;
    }) => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      silent?: boolean;
      showProgress?: boolean;
      rethrow?: boolean;
      jobId?: string;
      issueId?: string;
    }
  ): Promise<T | null> => {
    const showProgress = options?.showProgress ?? false;
    const isSilent = options?.silent ?? false;
    const taskId = showProgress ? `client-${crypto.randomUUID()}` : null;

    if (taskId) {
      enqueue({
        id: taskId,
        type: (name.includes('识别') || name.toLowerCase().includes('analy')) ? 'ai-analyze' : 'sync',
        label: name,
        createdAt: Date.now(),
        state: { status: 'pending' },
        execute: async () => {}, // dummy
        jobId: options?.jobId,
        issueId: options?.issueId
      } as any);
      startTask(taskId);
    }

    const updateProgress = (pct: number, msg?: string) => {
      if (taskId) {
        updateProgressState(taskId, Math.min(Math.max(pct, 0), 100), msg);
      }
    };

    try {
      const result = await fn({ updateProgress, taskId });
      if (taskId) {
        completeTask(taskId, result);
      }
      hapticFeedback.success();
      
      const shouldShowSuccess = options?.showSuccessToast ?? (taskId ? false : !isSilent);
      
      if (shouldShowSuccess) {
        showToast.success(`${name} 完成`);
      }
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      hapticFeedback.error();
      const errMsg = ErrorFactory.extractErrorMessage(error);

      if (taskId) {
        failTask(taskId, errMsg, false);
      }
      ErrorFactory.capture(error);
      
      if (options?.showErrorToast !== false) { 
        ErrorFactory.handleError(error, name); // Use global handler with Copy Detail button
      }
      
      const actualError = error instanceof Error ? error : new Error(errMsg);
      options?.onError?.(actualError);
      
      const shouldRethrow = options?.rethrow ?? true;
      if (shouldRethrow) {
        throw actualError;
      }
      return null;
    }
  }, [enqueue, startTask, updateProgressState, completeTask, failTask]);

  return { runTask };
}
