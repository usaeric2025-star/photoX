import { atom, getDefaultStore, PrimitiveAtom } from 'jotai';
import { Task } from '#lib/task-queue/types.js';

interface TaskServiceState {
  tasks: Map<string, Task>;
  activeCount: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
}

const LOCAL_STORAGE_KEY = 'photox_task_queue_v1';

function loadInitialTasks(): Map<string, Task> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      label: string;
      type: Task['type'];
      state: Task['state'];
      createdAt: number;
      meta?: Record<string, unknown>;
    }>;
    const map = new Map<string, Task>();
    parsed.forEach((t) => {
      let state = t.state;
      // Mark queued or processing tasks from previous sessions as interrupted/failed
      if (state.status === 'processing' || state.status === 'queued') {
        state = { status: 'failed', error: '页面刷新或离开中断了此任务', retryable: true, retryCount: 0 };
      }
      map.set(t.id, {
        id: t.id,
        label: t.label,
        type: t.type,
        state,
        createdAt: t.createdAt,
        meta: t.meta || {},
        execute: async () => {},
      });
    });
    return map;
  } catch {
    return new Map();
  }
}

function saveTasksToStorage(tasksMap: Map<string, Task>) {
  if (typeof window === 'undefined') return;
  try {
    const serializable = Array.from(tasksMap.values()).map((t) => ({
      id: t.id,
      label: t.label,
      type: t.type,
      state: t.state,
      createdAt: t.createdAt,
      meta: t.meta,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

export const tasksAtom = atom<Map<string, Task>>(loadInitialTasks()) as PrimitiveAtom<Map<string, Task>>;
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
  saveTasksToStorage(newTasks);
};

export const updateTaskState = (taskId: string, state: Partial<Task['state']>) => {
  const current = store.get(tasksAtom);
  const task = current.get(taskId);
  if (task) {
    const newTasks = new Map(current);
    newTasks.set(taskId, { ...task, state: { ...task.state, ...state } as Task['state'] });
    store.set(tasksAtom, newTasks);
    saveTasksToStorage(newTasks);
  }
};

export const clearAll = () => {
  store.set(tasksAtom, new Map());
  saveTasksToStorage(new Map());
};
