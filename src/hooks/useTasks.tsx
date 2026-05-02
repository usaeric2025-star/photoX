import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react';

export type TaskStatus = 'running' | 'completed' | 'error' | 'cancelled';

export interface BackgroundTask {
  id: string;
  name: string;
  progress: number;
  status: TaskStatus;
  message?: string;
  finishedAt?: number;
  onCancel?: () => void;
}

interface TaskContextType {
  tasks: BackgroundTask[];
  addTask: (task: Omit<BackgroundTask, 'id' | 'status' | 'progress'>) => string;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);

  const addTask = useCallback((taskData: Omit<BackgroundTask, 'id' | 'status' | 'progress'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setTasks(prev => [...prev, { ...taskData, id, status: 'running', progress: 0 }]);
    return id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newStatus = updates.status || t.status;
        const isFinished = newStatus !== 'running';
        return { 
          ...t, 
          ...updates, 
          finishedAt: isFinished && !t.finishedAt ? Date.now() : t.finishedAt 
        };
      }
      return t;
    }));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'running'));
  }, []);

  // Auto-remove completed/cancelled tasks after 8 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTasks(prev => {
        const now = Date.now();
        return prev.filter(t => {
          if (t.status === 'running') return true;
          if (t.finishedAt && now - t.finishedAt > 8000) return false;
          return true;
        });
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, removeTask, clearCompleted }}>
      {children}
      <BackgroundTaskPanel />
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within TaskProvider');
  return context;
};

const BackgroundTaskPanel: React.FC = () => {
  const { tasks, removeTask, clearCompleted } = useTasks();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeTasks = tasks.filter(t => t.status === 'running');
  const hasTasks = tasks.length > 0;

  if (!hasTasks) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-start gap-3">
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
                tasks.map(task => (
                  <div key={task.id} className="p-3 bg-white rounded-2xl border border-slate-50 hover:border-slate-100 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[11px] font-bold text-slate-700 truncate mr-2">{task.name}</span>
                       <div className="flex items-center gap-2">
                         {task.status === 'running' && (
                           <button 
                            onClick={() => task.onCancel?.()}
                            className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                           >
                            <X size={12} />
                           </button>
                         )}
                         <button 
                          onClick={() => removeTask(task.id)}
                          className="p-1 hover:bg-slate-100 text-slate-300 hover:text-slate-500 rounded-lg transition-colors"
                         >
                          <X size={12} />
                         </button>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' : 
                            task.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 w-8 text-right">
                        {Math.round(task.progress)}%
                      </span>
                    </div>

                    {task.message && (
                      <p className={`mt-1.5 text-[9px] font-medium ${
                        task.status === 'error' ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        {task.message}
                      </p>
                    )}
                  </div>
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
            <Loader2 size={20} className="animate-spin text-white" />
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
