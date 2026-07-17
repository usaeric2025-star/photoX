import { atom, getDefaultStore, PrimitiveAtom } from 'jotai';
import { Task } from '#lib/task-queue/types.js';

interface TaskServiceState {
  tasks: Map<string, Task>;
  activeCount: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export const tasksAtom = atom<Map<string, Task>>(new Map()) as PrimitiveAtom<Map<string, Task>>;
const globalTaskStatusAtom = atom<TaskServiceState['status']>('idle') as PrimitiveAtom<TaskServiceState['status']>;
const globalTaskProgressAtom = atom<number>(0) as PrimitiveAtom<number>;

export const activeTaskCountAtom = atom((get) => {
  let count = 0;
  const tasks = get(tasksAtom);
  tasks.forEach(t => {
    if (t.state?.status === 'processing' || t.state?.status === 'queued') {
      count++;
    }
  });
  return count;
});

const store = getDefaultStore();


export const setGlobalTaskStatus = (status: TaskServiceState['status']) => {
  store.set(globalTaskStatusAtom, status);
};

export const setGlobalTaskProgress = (progress: number) => {
  store.set(globalTaskProgressAtom, progress);
};

export const addTask = (task: Task) => {
  const current = store.get(tasksAtom);
  const newTasks = new Map(current);
  newTasks.set(task.id, task);
  store.set(tasksAtom, newTasks);
};

export const updateTaskState = (taskId: string, state: Partial<Task['state']>) => {
  const current = store.get(tasksAtom);
  const task = current.get(taskId);
  if (task) {
    const newTasks = new Map(current);
    newTasks.set(taskId, { ...task, state: { ...task.state, ...state } as Task['state'] });
    store.set(tasksAtom, newTasks);
  }
};

export const clearAll = () => {
  store.set(tasksAtom, new Map());
};
