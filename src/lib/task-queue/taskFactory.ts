import { scheduler } from './scheduler';
import { generateId } from '@/lib/id';
import { logger } from '@/lib/logger';
import { ErrorFactory } from '@/lib/error';
import { isTaskDrawerOpen } from '@/lib/store';
import { getErrorMessage } from '@/lib/error/errorMessages';
import type { Task, TaskType, TaskState } from './types';

export interface TaskConfig<T = unknown> {
  /** 任務類型 */
  type: TaskType;
  /** 任務標題 */
  label: string;
  /** 任務載荷（非必需，因為邏輯會被封裝在 execute 裡） */
  meta?: Record<string, unknown>;
  /** 執行邏輯 */
  execute: (signal: AbortSignal, onProgress: (progress: number, message?: string) => void) => Promise<T>;
  /** 完成回調 */
  onComplete?: (result: T) => void;
  /** 錯誤回調 */
  onError?: (error: Error) => void;
  /** 任務 ID，若未提供則自動生成 */
  id?: string;
  /** 靜默模式，不打開任務面板 */
  silent?: boolean;
}

/**
 * ✅ 統一的任務創建工廠
 * 所有任務觸發點必須經過這裡
 */
export function createTask<T>(config: TaskConfig<T>): string {
  const { 
    type, 
    label, 
    meta, 
    execute, 
    onComplete, 
    onError, 
    id = `${type}-${generateId()}`,
    silent = false
  } = config;

  // ✅ 標準化進度值（強制 0-1）
  const normalizedProgress = (p: number) => {
    return Math.max(0, Math.min(1, p));
  };

  const task: Task<T> = {
    id,
    label,
    type,
    state: { status: 'queued' } as TaskState,
    createdAt: Date.now(),
    meta,
    execute: async (signal, onProgress) => {
      try {
        const result = await execute(signal, (p, msg) => {
           onProgress(normalizedProgress(p), msg);
        });
        
        // 統一完成處理
        logger.info(`[TaskFactory] ${type} 任務完成: ${id}`);
        onComplete?.(result);
        return result;
      } catch (error) {
        // 統一錯誤處理
        const wrappedError = error instanceof Error ? error : new Error(String(error));
        const userMessage = getErrorMessage(wrappedError);
        
        logger.error(`[TaskFactory] ${type} 任務失敗: ${id}`, wrappedError);
        ErrorFactory.capture(wrappedError);
        
        // Pass original error or wrap it? Let's just create a new error with userMessage
        const errorToThrow = new Error(userMessage);
        (errorToThrow as any).originalError = wrappedError;
        
        onError?.(errorToThrow);
        throw errorToThrow; // Re-throw to let scheduler handle the state update
      }
    }
  };

  // 加入任務隊列
  scheduler.enqueue(task);

  if (!silent) {
    isTaskDrawerOpen.set(true);
  }

  return id;
}

/**
 * 等待任務完成的工廠方法
 */
export function executeTask<T>(config: TaskConfig<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    createTask({
      ...config,
      onComplete: (res) => {
        config.onComplete?.(res);
        resolve(res);
      },
      onError: (err) => {
        config.onError?.(err);
        reject(err);
      }
    });
  });
}

export function createBatchTasks<T>(
  items: T[],
  config: Omit<TaskConfig<T>, 'execute' | 'meta'> & {
    createPayload: (item: T) => { meta?: Record<string, unknown>, execute: TaskConfig<T>['execute'] }
  }
): string[] {
  return items.map((item) => {
    const payload = config.createPayload(item);
    return createTask({
      ...config,
      meta: payload.meta,
      execute: payload.execute
    });
  });
}

