import { signal, computed } from '@preact/signals-react';
import { Task } from '#lib/task-queue/types.js';

interface TaskServiceState {
  tasks: Map<string, Task>;
  activeCount: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export const tasksSignal = signal<Map<string, Task>>(new Map());
const globalTaskStatusSignal = signal<TaskServiceState['status']>('idle');
const globalTaskProgressSignal = signal<number>(0);

export const activeTaskCountSignal = computed(() => {
  let count = 0;
  tasksSignal.value.forEach(t => {
    if (t.state?.status === 'processing' || t.state?.status === 'queued') {
      count++;
    }
  });
  return count;
});

export const setGlobalTaskStatus = (status: TaskServiceState['status']) => {
  globalTaskStatusSignal.value = status;
};

export const setGlobalTaskProgress = (progress: number) => {
  globalTaskProgressSignal.value = progress;
};

const taskActions = {
  addTask: (task: Task) => {
    const newTasks = new Map(tasksSignal.value);
    newTasks.set(task.id, task);
    tasksSignal.value = newTasks;
  },
  updateTask: (taskId: string, updates: Partial<Task>) => {
    const newTasks = new Map(tasksSignal.value);
    const task = newTasks.get(taskId);
    if (task) {
      newTasks.set(taskId, { ...task, ...updates } as Task);
      tasksSignal.value = newTasks;
    }
  },
  updateTaskState: (taskId: string, state: Partial<Task['state']>) => {
    const newTasks = new Map(tasksSignal.value);
    const task = newTasks.get(taskId);
    if (task) {
      newTasks.set(taskId, { ...task, state: { ...task.state, ...state } as Task['state'] });
      tasksSignal.value = newTasks;
    }
  },
  removeTask: (taskId: string) => {
    const newTasks = new Map(tasksSignal.value);
    newTasks.delete(taskId);
    tasksSignal.value = newTasks;
  },
  clearAll: () => {
    tasksSignal.value = new Map();
  }
};

export const { addTask, updateTask, updateTaskState, removeTask, clearAll } = taskActions;


