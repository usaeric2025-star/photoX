import { signal, computed } from '@preact/signals-react';
import { Task } from '#lib/task-queue/types.js';

interface TaskServiceState {
  tasks: Map<string, Task>;
  activeCount: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export const tasksSignal = signal<Map<string, Task>>(new Map());
export const globalTaskStatusSignal = signal<TaskServiceState['status']>('idle');
export const globalTaskProgressSignal = signal<number>(0);

export const activeTaskCountSignal = computed(() => {
  let count = 0;
  tasksSignal.value.forEach(t => {
    if (t.state?.status === 'processing' || t.state?.status === 'queued') {
      count++;
    }
  });
  return count;
});

export const taskStore: {
  getState: () => TaskServiceState;
  setState: (updates: Partial<TaskServiceState> | ((state: TaskServiceState) => Partial<TaskServiceState>)) => void;
} = {
  getState: () => ({
    tasks: tasksSignal.value,
    activeCount: activeTaskCountSignal.value,
    status: globalTaskStatusSignal.value,
    progress: globalTaskProgressSignal.value,
  }),
  setState: (updates: Partial<TaskServiceState> | ((state: TaskServiceState) => Partial<TaskServiceState>)) => {
    const next = typeof updates === 'function' ? updates(taskStore.getState()) : updates;
    if (next.tasks !== undefined) tasksSignal.value = next.tasks;
    if (next.status !== undefined) globalTaskStatusSignal.value = next.status;
    if (next.progress !== undefined) globalTaskProgressSignal.value = next.progress;
  }
};

function getActiveCount(tasks: Map<string, Task>) {
  return Array.from(tasks.values()).filter(t => t.state?.status === 'processing' || t.state?.status === 'queued').length;
}

export const addTask = (task: Task) => {
  const newTasks = new Map(tasksSignal.value);
  newTasks.set(task.id, task);
  tasksSignal.value = newTasks;
};

export const updateTask = (taskId: string, updates: Partial<Task>) => {
  const newTasks = new Map(tasksSignal.value);
  const task = newTasks.get(taskId);
  if (task) {
    newTasks.set(taskId, { ...task, ...updates } as Task);
    tasksSignal.value = newTasks;
  }
};

export const updateTaskState = (taskId: string, state: Partial<Task['state']>) => {
  const newTasks = new Map(tasksSignal.value);
  const task = newTasks.get(taskId);
  if (task) {
    newTasks.set(taskId, { ...task, state: { ...task.state, ...state } as Task['state'] });
    tasksSignal.value = newTasks;
  }
};

export const removeTask = (taskId: string) => {
  const newTasks = new Map(tasksSignal.value);
  newTasks.delete(taskId);
  tasksSignal.value = newTasks;
};

export const clearAll = () => {
  tasksSignal.value = new Map();
};

export const setGlobalTaskStatus = (status: TaskServiceState['status']) => globalTaskStatusSignal.value = status;
export const setGlobalTaskProgress = (progress: number) => globalTaskProgressSignal.value = progress;


