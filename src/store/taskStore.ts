import { createStore } from '@storve/core';
import { useStore } from '@storve/react';
import { Task } from '@/lib/task-queue/types';

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

// Internal store reference with setState exposed to avoid repeating casts
export type TaskStoreInstance = ReturnType<typeof createStore<TaskStoreState>> & { 
  setState: (updates: Partial<TaskStoreState> | ((state: TaskStoreState) => Partial<TaskStoreState>)) => void 
};

export const taskStore = createStore<TaskStoreState>({
  tasks: new Map(),

  enqueue: (task) => (taskStore as unknown as TaskStoreInstance).setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    tasks.set(task.id, task);
    return { tasks };
  }),

  startTask: (id) => (taskStore as unknown as TaskStoreInstance).setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'processing', progress: 0 } });
    }
    return { tasks };
  }),

  updateProgress: (id, progress, message) => (taskStore as unknown as TaskStoreInstance).setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task && task.state?.status === 'processing') {
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

  failTask: (id, error, retryable) => (taskStore as unknown as TaskStoreInstance).setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'failed', error, retryable, retryCount: 0 } });
    }
    return { tasks };
  }),

  completeTask: (id, result) => (taskStore as unknown as TaskStoreInstance).setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'completed', result } });
    }
    return { tasks };
  }),

  cancelTask: (id) => (taskStore as unknown as TaskStoreInstance).setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'cancelled' } });
    }
    return { tasks };
  }),

  restoreFromSupabase: (tasks) => (taskStore as unknown as TaskStoreInstance).setState(() => {
    const map = new Map();
    tasks.forEach(t => map.set(t.id, t));
    return { tasks: map };
  }),

  clearAll: () => (taskStore as unknown as TaskStoreInstance).setState({ tasks: new Map() }),
});

export function useTaskStore(): TaskStoreState;
export function useTaskStore<T>(selector: (state: TaskStoreState) => T): T;
export function useTaskStore<T>(selector?: (state: TaskStoreState) => T): T | TaskStoreState {
  if (selector) {
    return useStore(taskStore, selector);
  }
  return useStore(taskStore) as TaskStoreState;
}
export const useTaskSelector = useTaskStore;
