import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ErrorFactory } from '../../../lib/error/ErrorFactory';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react';

import { useLocalStorage } from '@mantine/hooks';

export type TaskStatus = 'running' | 'completed' | 'error' | 'cancelled';

export interface BackgroundTask {
  id: string;
  name: string;
  progress: number;
  status: TaskStatus;
  message?: string;
  finished_at?: number;
  onCancel?: () => void;
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

const STORAGE_KEY = 'photox_background_tasks';

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const cancelCallbacks = useRef<Map<string, () => void>>(new Map());

  const [tasks, setTasks] = useLocalStorage<BackgroundTask[]>({
    key: STORAGE_KEY,
    defaultValue: [],
    serialize: (value) => JSON.stringify(value.map(({ onCancel: _, ...t }) => t)),
    deserialize: (value) => {
      try {
        const parsed = JSON.parse(value || '[]');
        return parsed.map((t: any) => ({ ...t }));
      } catch (e) {
        return [];
      }
    }
  });

  const [isAvoidingSelection, setAvoidingSelection] = useState(false);

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

  // Auto-remove completed/cancelled tasks after 8 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTasks(prev => {
        const now = Date.now();
        const next = prev.filter(t => {
          if (t.status === 'running') return true;
          if (t.finished_at && now - t.finished_at > 8000) return false;
          return true;
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [setTasks]);

  const value = React.useMemo(() => ({
    tasks, addTask, updateTask, removeTask, clearCompleted, isAvoidingSelection, setAvoidingSelection, cancelTask, isTaskRunning
  }), [tasks, addTask, updateTask, removeTask, clearCompleted, isAvoidingSelection, setAvoidingSelection, cancelTask, isTaskRunning]);

  return (
    <TaskContext.Provider value={value}>
      {children}
      <BackgroundTaskPanel />
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw ErrorFactory.wrap(new Error('useTasks must be used within TaskProvider'), 'useTasks');
  return context;
};

function BackgroundTaskPanel() {
  const { tasks, removeTask, clearCompleted, isAvoidingSelection, cancelTask } = useTasks();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeTasks = tasks.filter(t => t.status === 'running');
  const hasTasks = tasks.length > 0;

  // Auto expand when there are active tasks starting
  useEffect(() => {
    if (activeTasks.length > 0) {
      setIsExpanded(true);
    }
  }, [activeTasks.length]);

  if (!hasTasks) return null;

  return (
    <div className={`fixed ${isAvoidingSelection ? 'bottom-32' : 'bottom-20'} left-6 z-header flex flex-col items-start gap-3 transition-all duration-300`}>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-72 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl overflow-hidden mb-2"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">任务管理器 / TASKS</h4>
              <button 
                onClick={clearCompleted}
                className="text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase"
              >
                清除已完成
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2 space-y-1 no-scrollbar">
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[10px]">没有进行中的任务</div>
              ) : (
                tasks.map((task, index) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 bg-white rounded-2xl border border-slate-50 hover:border-slate-100 transition-all group relative overflow-hidden"
                  >
                    {task.status === 'running' && (
                      <motion.div 
                        className="absolute bottom-0 left-0 h-[2px] bg-blue-500/20 w-full"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2 truncate flex-1 mr-2">
                         {task.status === 'running' ? (
                           <Loader2 size={16} className="text-blue-500 animate-spin" />
                         ) : task.status === 'completed' ? (
                           <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                         ) : (
                           <AlertCircle size={12} className="text-red-500 shrink-0" />
                         )}
                         <span className="text-[11px] font-bold text-slate-700 truncate">{task.name}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         {task.status === 'running' ? (
                           <button 
                            onClick={() => cancelTask(task.id)}
                            title="取消任务"
                            className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors scale-90"
                           >
                            <X size={12} />
                           </button>
                         ) : (
                           <button 
                            onClick={() => removeTask(task.id)}
                            title="移除记录"
                            className="p-1 hover:bg-slate-100 text-slate-300 hover:text-slate-500 rounded-lg transition-colors scale-90"
                           >
                            <X size={12} />
                           </button>
                         )}
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' : 
                            task.status === 'error' ? 'bg-red-500' : 
                            task.status === 'cancelled' ? 'bg-slate-400' :
                            'bg-blue-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 w-8 text-right tabular-nums">
                        {Math.round(task.progress)}%
                      </span>
                    </div>

                    {task.message && (
                      <p className={`mt-1.5 text-[9px] font-medium leading-tight ${
                        task.status === 'error' ? 'text-red-500' : 
                        task.status === 'cancelled' ? 'text-slate-400' :
                        'text-slate-400'
                      }`}>
                        {typeof task.message === 'string' ? task.message : JSON.stringify(task.message)}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        layout
        onClick={() => setIsExpanded(!isExpanded)}
        className={`h-14 flex items-center gap-3 px-4 rounded-full shadow-xl border transition-all ${
          activeTasks.length > 0 
            ? 'bg-blue-600 border-blue-500 text-white' 
            : 'bg-white border-slate-200 text-slate-600'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          {activeTasks.length > 0 ? (
            <Loader2 size={20} className="text-white animate-spin" />
          ) : (
            <CheckCircle2 size={20} className="text-green-500" />
          )}
          {activeTasks.length > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-[8px] font-black flex items-center justify-center rounded-full border-2 border-blue-600">
              {activeTasks.length}
            </span>
          )}
        </div>
        
        <div className="flex flex-col items-start leading-none pr-2">
          <span className="text-[10px] font-black uppercase tracking-widest">
            {activeTasks.length > 0 ? '管理任务' : '已完成'}
          </span>
          <span className="text-[8px] font-bold opacity-70">
            {isExpanded ? '点击收起' : '点击查看进度'}
          </span>
        </div>
        
        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </motion.button>
    </div>
  );
};
