import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import { useStore } from '@storve/react';
import { Task } from '@/lib/task-queue/types';

export interface TaskStoreState {
  tasks: Map<string, Task>;
  aiStatus: { status: 'idle' | 'processing' | 'completed' | 'failed', photoId?: string, result?: unknown, error?: string };
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  enqueue: (task: Task) => void;
  startTask: (id: string) => void;
  updateProgress: (id: string, progress: number, message?: string) => void;
  failTask: (id: string, error: string, retryable: boolean) => void;
  completeTask: (id: string, result?: unknown) => void;
  cancelTask: (id: string) => void;
  restoreFromSupabase: (tasks: Task[]) => void;
  clearAll: () => void;
  setAiStatus: (status: TaskStoreState['aiStatus']) => void;
  setGlobalStatus: (status: TaskStoreState['status']) => void;
  setGlobalProgress: (progress: number) => void;
}

export type TaskStoreInstance = ReturnType<typeof createStore<TaskStoreState>>;

export const taskStore = createStore<TaskStoreState>({
  tasks: new Map(),
  aiStatus: { status: 'idle' },
  status: 'idle',
  progress: 0,

  setAiStatus: (aiStatus) => taskStore.setState({ aiStatus }),
  setGlobalStatus: (status) => taskStore.setState({ status }),
  setGlobalProgress: (progress) => taskStore.setState({ progress }),

  enqueue: (task) => taskStore.setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    tasks.set(task.id, task);
    return { tasks };
  }),

  startTask: (id) => taskStore.setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'processing', progress: 0 } });
    }
    return { tasks };
  }),

  updateProgress: (id, progress, message) => taskStore.setState((state: TaskStoreState) => {
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

  failTask: (id, error, retryable) => taskStore.setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'failed', error, retryable, retryCount: 0 } });
    }
    return { tasks };
  }),

  completeTask: (id, result) => taskStore.setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'completed', result } });
    }
    return { tasks };
  }),

  cancelTask: (id) => taskStore.setState((state: TaskStoreState) => {
    const tasks = new Map(state.tasks);
    const task = tasks.get(id);
    if (task) {
      tasks.set(id, { ...task, state: { ...task.state, status: 'cancelled' } });
    }
    return { tasks };
  }),

  restoreFromSupabase: (tasks) => taskStore.setState(() => {
    const map = new Map();
    tasks.forEach(t => map.set(t.id, t));
    return { tasks: map };
  }),

  clearAll: () => taskStore.setState({ tasks: new Map() }),
});

export const tasksSignal = signal(taskStore, 'tasks');

export function useTaskStore<T = TaskStoreState>(selector?: (state: TaskStoreState) => T): T {
  return useStore(taskStore, selector);
}
export const useTaskSelector = useTaskStore;

// Computed selectors
export const activeTaskCountSelector = (state: TaskStoreState) => Array.from(state.tasks.values()).filter(
  (t: Task) => t.state?.status === 'processing' || t.state?.status === 'queued'
).length;
