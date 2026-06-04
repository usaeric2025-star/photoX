import { useCallback } from 'react';
import { useTasks } from './useTasks';
import { reportError } from '@/lib/errorReporter';
import { toast } from '@/lib/ui/toast';
import { extractErrorMessage } from '@/lib/error/errorHandler';

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
      rethrow?: boolean;
    }
  ): Promise<T | null> => {
    const isUpload = name.includes('上传') || name.toLowerCase().includes('upload');
    const isAi = name.includes('AI') || name.includes('识别') || name.toLowerCase().includes('analysis');
    const isSilent = options?.silent ?? (isUpload || isAi);

    const taskId = isSilent ? null : addTask({ name });

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
      if (!isSilent && options?.showSuccessToast !== false) {
        toast.success(`${name} 完成`);
      }
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const errMsg = extractErrorMessage(error);
      if (taskId) {
        updateTask(taskId, { status: 'error', progress: 100, message: `${name} 失败: ${errMsg}` });
      }
      reportError(errMsg, name);
      
      // 💡 提升診斷體驗：默認在主界面彈出 toast.error 錯誤提示，防範“失敗不報警”的不良體感
      if (!isSilent && options?.showErrorToast !== false) {
        toast.error(`${name} 失敗: ${errMsg}`);
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
