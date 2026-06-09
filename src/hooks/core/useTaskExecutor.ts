import { useCallback } from 'react';
import { useTasks } from './useTasks';
import { reportError } from '@/lib/errorReporter';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/error/errorHandler';
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
    const showProgress = options?.showProgress ?? !options?.silent;
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
      
      // 遵循 AGENTS.md 规范：若已在任务中心显示进度，则不显示重复 Toast
      // 除非显式配置 showSuccessToast: true
      const shouldShowSuccess = options?.showSuccessToast ?? (taskId ? false : !isSilent);
      
      if (shouldShowSuccess) {
        toast.success(`${name} 完成`);
      }
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      hapticFeedback.error();
      const errMsg = extractErrorMessage(error);
      if (taskId) {
        updateTask(taskId, { status: 'error', progress: 100, message: `${name} 失败: ${errMsg}` });
      }
      reportError(errMsg, name);
      
      if (options?.showErrorToast !== false) { // Always show errors
        toast.error(`${name} 失败: ${errMsg}`);
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
