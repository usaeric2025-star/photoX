import { useCallback } from 'react';
import { useTasks } from './useTasks';
import { reportError } from '@/lib/errorReporter';
import { toast } from '@/lib/ui/toast';

/**
 * Hook for executing long-running tasks with background progress tracking.
 */
export function useTaskExecutor() {
  const { addTask, updateTask } = useTasks();

  const runTask = useCallback(async <T,>(
    name: string,
    fn: (ctx: { updateProgress: (pct: number, msg?: string) => void }) => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      silent?: boolean;
    }
  ): Promise<T | null> => {
    const taskId = options?.silent ? null : addTask({ name });

    const updateProgress = (pct: number, msg?: string) => {
      if (taskId) {
        updateTask(taskId, { progress: Math.min(Math.max(pct, 0), 100), message: msg });
      }
    };

    try {
      const result = await fn({ updateProgress });
      if (taskId) {
        updateTask(taskId, { status: 'completed', progress: 100, message: `${name} 成功` });
      }
      if (!options?.silent && options?.showSuccessToast !== false) {
        toast.success(`${name} 完成`);
      }
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      if (taskId) {
        updateTask(taskId, { status: 'error', progress: 100, message: `${name} 失败: ${(error as Error).message || '未知错误'}` });
      }
      reportError(error as Error, name);
      options?.onError?.(error as Error);
      return null;
    }
  }, [addTask, updateTask]);

  return { runTask };
}
