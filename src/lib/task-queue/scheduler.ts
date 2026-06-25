import { Task } from './types';
import { taskStore, TaskStoreInstance } from '@/store/taskStore';
import { taskTable } from './integrations/supabase';
import { showToast } from '@/lib/ui/toast';
import { logger } from '@/lib/logger';

export class TaskScheduler {
  private queue: Task[] = [];
  private running = new Set<string>();
  private maxConcurrency: number;
  
  // ✅ AbortController 僅存於內部 Map，不污染 Task 物件
  private controllers = new Map<string, AbortController>();
  
  // ✅ 去重檢查：type + meta.key
  private activeKeys = new Set<string>();

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  // ✅ 唯一 enqueue 入口
  enqueue(task: Task) {
    // 冪等檢查
    const key = `${task.type}:${task.meta?.key || task.id}`;
    if (this.activeKeys.has(key)) {
      logger.warn(`[Task] Duplicate task skipped: ${key}`);
      return;
    }
    this.activeKeys.add(key);

    // 1. 寫入 Store（UI 驅動）
    (taskStore as TaskStoreInstance).state.enqueue(task);
    
    // 2. 寫入 Supabase（持久層）
    taskTable.insert(task).catch(e => logger.error('[Task] insert error', e));
    
    // 3. 加入調度佇列
    this.queue.push(task);
    this.tick();
  }

  cancel(id: string) {
    // ✅ 從內部 Map 取得 Controller
    const controller = this.controllers.get(id);
    if (controller) {
      controller.abort();
      this.controllers.delete(id);
    }
    
    // 從佇列移除
    this.queue = this.queue.filter(t => t.id !== id);
    this.running.delete(id);
    
    // 更新 Store
    (taskStore as TaskStoreInstance).state.cancelTask(id);
    
    // 更新 Supabase
    taskTable.updateStatus(id, 'cancelled').catch(e => logger.error('[Task] cancel error', e));
    
    // 釋放去重鍵
    const task = this.findTask(id);
    if (task) {
      const key = `${task.type}:${task.meta?.key || task.id}`;
      this.activeKeys.delete(key);
    }
    
    this.tick();
  }

  retry(id: string) {
    const task = this.findTask(id);
    if (!task || task.state.status !== 'failed') return;
    
    // 重置狀態
    task.state = { status: 'queued' };
    this.queue.push(task);
    this.tick();
  }

  private tick() {
    while (this.running.size < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.running.add(task.id);
      this.execute(task);
    }
  }

  private async execute(task: Task) {
    // ✅ 每個任務獨立 AbortController
    const controller = new AbortController();
    this.controllers.set(task.id, controller);
    const store = (taskStore as TaskStoreInstance).state;

    try {
      // 更新 Supabase: processing
      await taskTable.updateStatus(task.id, 'processing');
      store.startTask(task.id);
      store.setGlobalStatus('processing');
      store.setGlobalProgress(0);

      const onProgress = (progress: number, message?: string) => {
        store.updateProgress(task.id, progress, message);
        store.setGlobalProgress(progress);
      };

      const result = await task.execute(controller.signal, onProgress);

      // 完成
      store.completeTask(task.id, result);
      store.setGlobalStatus('completed');
      store.setGlobalProgress(100);
      await taskTable.updateStatus(task.id, 'completed', result);
      
      showToast.success(`任務完成: ${task.label}`);

      // 觸發 querySync（通過事件訂閱）
      this.onTaskComplete?.(task);

    } catch (error) {
      // 如果是取消，不觸發錯誤處理
      if (controller.signal.aborted) {
        (taskStore as TaskStoreInstance).state.setGlobalStatus('idle');
        this.controllers.delete(task.id);
        this.running.delete(task.id);
        this.tick();
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      const retryable = true; // 可根據錯誤類型判斷

      store.failTask(task.id, message, retryable);
      store.setGlobalStatus('failed');
      await taskTable.updateStatus(task.id, 'failed', { error: message, retryable });

      showToast.error(`任務失敗: ${task.label}`);
    } finally {
      this.controllers.delete(task.id);
      this.running.delete(task.id);
      
      if (this.running.size === 0 && this.queue.length === 0) {
        store.setGlobalStatus('idle');
        store.setGlobalProgress(0);
      }
      
      // 釋放去重鍵（僅 completed 或 failed）
      const key = `${task.type}:${task.meta?.key || task.id}`;
      this.activeKeys.delete(key);
      
      this.tick();
    }
  }

  // 供 querySync 訂閱
  onTaskComplete?: (task: Task) => void;

  // 從 Supabase 恢復任務
  async restore() {
    const tasks = await taskTable.restorePending();
    if (tasks.length === 0) return;

    // ✅ 先清除記憶體中可能存在的重複任務
    const store = (taskStore as TaskStoreInstance).state;
    tasks.forEach(task => {
      const key = `${task.type}:${task.meta?.key || task.id}`;
      // In a real restore, we need to bind the execute function again based on task type.
      // For now, this is a placeholder.
      if (!this.activeKeys.has(key)) {
        this.activeKeys.add(key);
        store.enqueue(task);
        this.queue.push(task);
      }
    });
    this.tick();
  }

  private findTask(id: string): Task | undefined {
    // 先查佇列
    let found = this.queue.find(t => t.id === id);
    if (found) return found;
    
    // 再查執行中
    const store = (taskStore as TaskStoreInstance).state;
    return store.tasks.get(id);
  }
}

// 單例
export const scheduler = new TaskScheduler(3);
