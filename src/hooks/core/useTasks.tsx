import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { JobResumer } from '@/components/tasks/JobResumer';
import { BackgroundTaskPanel } from '@/components/tasks/BackgroundTaskPanel';

export type TaskStatus = 'running' | 'completed' | 'error' | 'cancelled';

export interface BackgroundTask {
  id: string;
  name: string;
  progress: number;
  status: TaskStatus;
  message?: string;
  finished_at?: number;
  onCancel?: () => void;
  jobId?: string; // For server-side jobs
  issueId?: string; // For diagnostics mapping
}

interface TaskContextType {
  tasks: BackgroundTask[];
  addTask: (task: Omit<BackgroundTask, 'id' | 'status' | 'progress'>) => string;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
  setAvoidingSelection: (isAvoiding: boolean) => void;
  isAvoidingSelection: boolean;
  cancelTask: (id: string) => void;
  isTaskRunning: (namePrefix: string) => boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const cancelCallbacks = useRef<Map<string, () => void>>(new Map());

  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [isAvoidingSelection, setAvoidingSelection] = useState(false);
  const tasksRef = useRef<BackgroundTask[]>([]);
  tasksRef.current = tasks;

  // Load from IndexedDB on mount
  useEffect(() => {
    const initTasks = async () => {
      const { syncCache } = await import('@/lib/db/indexedDB');
      const savedTasks = await syncCache.getTasks();
      if (savedTasks && Array.isArray(savedTasks)) {
        // Filter out completed tasks that are too old already
        const now = Date.now();
        const validTasks = savedTasks.filter(t => {
          if (t.status === 'running') return true;
          if (t.finished_at && now - t.finished_at < 3000) return true;
          return false;
        }).map(t => ({
          ...t,
          onCancel: undefined // Functions can't be persisted
        }));
        setTasks(validTasks);
      }
    };
    initTasks();
  }, []);

  // Sync to IndexedDB on any change
  useEffect(() => {
    const persistTasks = async () => {
      const { syncCache } = await import('@/lib/db/indexedDB');
      // Strip onCancel before saving
      const serializableTasks = tasks.map(({ onCancel, ...rest }) => rest);
      await syncCache.saveTasks(serializableTasks);
    };
    persistTasks();
  }, [tasks]);

  const addTask = useCallback((taskData: Omit<BackgroundTask, 'id' | 'status' | 'progress'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    if (taskData.onCancel) {
      cancelCallbacks.current.set(id, taskData.onCancel);
    }
    const newTask: BackgroundTask = { ...taskData, id, status: 'running', progress: 0 };
    setTasks(prev => [...prev, newTask]);
    return id;
  }, [setTasks]);

  const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
    if (updates.status && updates.status !== 'running') {
      cancelCallbacks.current.delete(id);
    }
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newStatus = updates.status || t.status;
        const isFinished = newStatus !== 'running';
        return { 
          ...t, 
          ...updates, 
          finished_at: isFinished && !t.finished_at ? Date.now() : t.finished_at 
        };
      }
      return t;
    }));
  }, [setTasks]);

  const removeTask = useCallback((id: string) => {
    cancelCallbacks.current.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [setTasks]);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'running'));
  }, [setTasks]);

  const cancelTask = useCallback((id: string) => {
    const cb = cancelCallbacks.current.get(id);
    if (cb) {
      try {
        cb();
      } catch (e) {
        console.error('onCancel callback execution error:', e);
      }
    }
    cancelCallbacks.current.delete(id);
    updateTask(id, {
      status: 'cancelled',
      message: '任务已被用户手动强行取消',
      finished_at: Date.now()
    });
  }, [updateTask]);

  const isTaskRunning = useCallback((namePrefix: string) => {
    return tasks.some(t => t.status === 'running' && t.name.startsWith(namePrefix));
  }, [tasks]);

  // Auto-remove completed/cancelled tasks after 3 seconds for a snappier experience
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTasks(prev => {
        const now = Date.now();
        const next = prev.filter(t => {
          if (t.status === 'running') return true;
          if (t.finished_at && now - t.finished_at > 3000) return false;
          return true;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const value = React.useMemo(() => ({
    tasks, addTask, updateTask, removeTask, clearCompleted, isAvoidingSelection, setAvoidingSelection, cancelTask, isTaskRunning
  }), [tasks, addTask, updateTask, removeTask, clearCompleted, isAvoidingSelection, setAvoidingSelection, cancelTask, isTaskRunning]);

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw ErrorFactory.wrap(new Error('useTasks must be used within TaskProvider'), 'useTasks');
  return context;
};
