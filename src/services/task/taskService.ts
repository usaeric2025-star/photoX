import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import { Task } from '#lib/task-queue/types';

interface TaskServiceState {
  tasks: Map<string, Task>;
  activeCount: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export const taskStore = createStore<TaskServiceState>({
  tasks: new Map(),
  activeCount: 0,
  status: 'idle',
  progress: 0,
});

export const tasksSignal = signal<TaskServiceState, 'tasks'>(taskStore, 'tasks');
export const activeTaskCountSignal = signal<TaskServiceState, 'activeCount'>(taskStore, 'activeCount');
export const globalTaskStatusSignal = signal<TaskServiceState, 'status'>(taskStore, 'status');
export const globalTaskProgressSignal = signal<TaskServiceState, 'progress'>(taskStore, 'progress');

function getActiveCount(tasks: Map<string, Task>) {
  return Array.from(tasks.values()).filter(t => t.state?.status === 'processing' || t.state?.status === 'queued').length;
}

export const addTask = (task: Task) => {
  taskStore.setState(s => {
    const newTasks = new Map(s.tasks);
    newTasks.set(task.id, task);
    return { tasks: newTasks, activeCount: getActiveCount(newTasks) };
  });
};

export const updateTask = (taskId: string, updates: Partial<Task>) => {
  taskStore.setState(s => {
    const newTasks = new Map(s.tasks);
    const task = newTasks.get(taskId);
    if (task) {
      newTasks.set(taskId, { ...task, ...updates });
      return { tasks: newTasks, activeCount: getActiveCount(newTasks) };
    }
    return {};
  });
};

export const updateTaskState = (taskId: string, state: Partial<Task['state']>) => {
  taskStore.setState(s => {
    const newTasks = new Map(s.tasks);
    const task = newTasks.get(taskId);
    if (task) {
      newTasks.set(taskId, { ...task, state: { ...task.state, ...state } as Task['state'] });
      return { tasks: newTasks, activeCount: getActiveCount(newTasks) };
    }
    return {};
  });
};

export const removeTask = (taskId: string) => {
  taskStore.setState(s => {
    const newTasks = new Map(s.tasks);
    newTasks.delete(taskId);
    return { tasks: newTasks, activeCount: getActiveCount(newTasks) };
  });
};

export const clearAll = () => {
  taskStore.setState({ tasks: new Map(), activeCount: 0 });
};

// Also expose manual setters for global status
export const setGlobalTaskStatus = (status: TaskServiceState['status']) => taskStore.setState({ status });
export const setGlobalTaskProgress = (progress: number) => taskStore.setState({ progress });


