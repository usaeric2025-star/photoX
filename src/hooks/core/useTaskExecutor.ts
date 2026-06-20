import { useCallback } from 'react';
import { useTasks } from './useTasks';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error';
import { hapticFeedback } from '@/lib/ui/haptics';

/**
 * Hook for executing long-running tasks with background progress tracking.
 */
export function useTaskExecutor() {
  const { addTask, updateTask } = useTasks();

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

    const taskId = showProgress ? addTask({ 
      name, 
      jobId: options?.jobId,
      issueId: options?.issueId
    }) : null;

    const updateProgress = (pct: number, msg?: string) => {
      if (taskId) {
        updateTask(taskId, { progress: Math.min(Math.max(pct, 0), 100), message: msg });
      }
    };

    try {
      const result = await fn({ updateProgress, taskId });
      if (taskId) {
        updateTask(taskId, { status: 'completed', progress: 100, message: `${name} 完成` });
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
      const standardErrorMsg = `${name} 失败: ${errMsg}`;

      if (taskId) {
        updateTask(taskId, { status: 'error', progress: 100, message: standardErrorMsg });
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
  }, [addTask, updateTask]);

  return { runTask };
}
