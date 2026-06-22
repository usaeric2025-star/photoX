import { create } from 'zustand';
import { Task } from './types';

export interface TaskStoreState {
  tasks: Map<string, Task>;
  enqueue: (task: Task) => void;
  startTask: (id: string) => void;
  updateProgress: (id: string, progress: number, message?: string) => void;
  failTask: (id: string, error: string, retryable: boolean) => void;
  completeTask: (id: string, result?: unknown) => void;
  cancelTask: (id: string) => void;
  restoreFromSupabase: (tasks: Task[]) => void;
  clearAll: () => void;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks: new Map(),
  
  enqueue: (task) => set((state) => {
    const tasks = new Map(state.tasks);
    tasks.set(task.id, task);
    return { tasks };
  }),
  
  startTask: (id) => set((state) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { status: 'processing', progress: 0 } });
    }
    return { tasks };
  }),
  
  updateProgress: (id, progress, message) => set((state) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task && task.state.status === 'processing') {
      tasks.set(id, {
        ...task,
        state: {
          ...task.state,
          progress,
          message: message || task.state.message
        }
      });
    }
    return { tasks };
  }),
  
  failTask: (id, error, retryable) => set((state) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { status: 'failed', error, retryable, retryCount: 0 } });
    }
    return { tasks };
  }),
  
  completeTask: (id, result) => set((state) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { status: 'completed', result } });
    }
    return { tasks };
  }),
  
  cancelTask: (id) => set((state) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { status: 'cancelled' } });
    }
    return { tasks };
  }),
  
  restoreFromSupabase: (tasks) => set(() => {
    const map = new Map();
    tasks.forEach(t => map.set(t.id, t));
    return { tasks: map };
  }),
  
  clearAll: () => set({ tasks: new Map() }),
}));

// ✅ 封裝 selector Hook（避免記憶體洩漏）
export function useTaskSelector<T>(
  selector: (state: TaskStoreState) => T
): T {
  return useTaskStore(selector);
}
