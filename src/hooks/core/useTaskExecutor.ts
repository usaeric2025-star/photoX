import { useTasks } from './useTasks';
import { reportError } from '@/lib/errorReporter';
import { toast } from 'sonner';

export function useTaskExecutor() {
  const { addTask, updateTask } = useTasks();

  const runTask = async <T>(
    name: string,
    fn: (ctx: { updateProgress: (pct: number, msg?: string) => void }) => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
    }
  ): Promise<T | null> => {
    const taskId = addTask({ name });

    const updateProgress = (pct: number, msg?: string) => {
      updateTask(taskId, { progress: Math.min(Math.max(pct, 0), 100), message: msg });
    };

    try {
      const result = await fn({ updateProgress });
      updateTask(taskId, { status: 'completed', progress: 100, message: `${name} 成功` });
      if (options?.showSuccessToast !== false) {
        toast.success(`${name} 完成`);
      }
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      updateTask(taskId, { status: 'error', progress: 100, message: `${name} 失败: ${(error as Error).message || '未知错误'}` });
      reportError(error as Error, name);
      options?.onError?.(error as Error);
      return null;
    }
  };

  return { runTask };
}
