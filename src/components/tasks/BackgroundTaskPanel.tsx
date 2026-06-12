import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Terminal, HardDrive } from 'lucide-react';
import { useTasks } from '@/hooks/core/useTasks';
import { useGlobalTasks } from '@/hooks/admin/useGlobalTasks';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/store/useUIStore';

export function BackgroundTaskPanel() {
  const { removeTask, clearCompleted, isAvoidingSelection, cancelTask } = useTasks();
  const { tasks: allTasks } = useGlobalTasks();
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const updateStore = useUIStore(s => s.update);
  
  const activeTasks = allTasks.filter(t => t.status === 'processing' || t.status === 'running' as any);
  const hasTasks = allTasks.length > 0;
  const isTaskPage = location.pathname.includes('/tasks');
  const isAdminPath = location.pathname.startsWith('/admin');

  // Auto expand when there are active tasks starting, auto-collapse when finished after 2s
  useEffect(() => {
    if (activeTasks.length > 0) {
      setIsExpanded(true);
    } else {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTasks.length]);

  if (!hasTasks || isTaskPage) return null;

  return (
    <div className={`fixed ${isAvoidingSelection ? 'bottom-32' : 'bottom-16'} left-6 z-toast flex flex-col items-start gap-3 transition-all duration-300`}>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl overflow-hidden mb-2"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex flex-col">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">任务管理器 / HUB</h4>
                <p className="text-[8px] text-slate-400 font-bold">SESSION & MAINTENANCE</p>
              </div>
              <button 
                onClick={clearCompleted}
                className="text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase"
              >
                清除本地
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2 space-y-1.5 no-scrollbar">
              {allTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[10px]">没有进行中的任务</div>
              ) : (
                allTasks.map((task, index) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-2xl border transition-all group relative overflow-hidden ${
                      task.source === 'maintenance' ? 'bg-slate-50/50 border-slate-100 hover:border-slate-200' : 'bg-white border-slate-50 hover:border-slate-100'
                    }`}
                  >
                    {task.status === 'processing' && (
                      <div className="absolute bottom-0 left-0 h-[2.5px] bg-blue-500/30 w-full animate-pulse" />
                    )}
                    <div className="flex items-start justify-between mb-2">
                       <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                         <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            task.source === 'maintenance' ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600'
                         }`}>
                           {task.status === 'processing' ? (
                             <Loader2 size={12} className="animate-spin" />
                           ) : task.source === 'maintenance' ? (
                             <Terminal size={12} />
                           ) : (
                             <HardDrive size={12} />
                           )}
                         </div>
                         <div className="flex flex-col truncate">
                           <span className="text-[10px] font-black text-slate-800 truncate leading-tight">{task.title || (task as any).name}</span>
                           <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                             {task.source === 'maintenance' ? '系统维护' : '会话任务'}
                           </span>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         {task.source === 'session' && (
                           task.status === 'processing' || (task as any).status === 'running' ? (
                            <button 
                             onClick={() => cancelTask(task.id)}
                             title="取消任务"
                             className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors scale-90"
                            >
                             <X size={12} />
                            </button>
                           ) : (
                            <button 
                             onClick={() => removeTask(task.id)}
                             title="移除记录"
                             className="p-1.5 hover:bg-slate-100 text-slate-300 hover:text-slate-500 rounded-lg transition-colors scale-90"
                            >
                             <X size={12} />
                            </button>
                           )
                         )}
                         {task.source === 'maintenance' && (
                           <button 
                            onClick={() => {
                              if (isAdminPath) {
                                navigate({ to: '/admin/diagnose' });
                                updateStore({ activeScreen: 'diagnose' });
                              } else {
                                navigate({ to: '/admin' });
                              }
                            }}
                            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-lg transition-colors scale-90"
                           >
                            <ChevronUp size={12} className="rotate-90" />
                           </button>
                         )}
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ease-out ${
                            task.status === 'completed' ? 'bg-green-500' : 
                            task.status === 'failed' ? 'bg-red-500' : 
                            task.source === 'maintenance' ? 'bg-slate-900' : 'bg-blue-600'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 w-8 text-right tabular-nums">
                        {Math.round(task.progress)}%
                      </span>
                    </div>

                    {task.message && (
                      <p className={`mt-2 text-[9px] font-medium leading-[1.4] ${
                        task.status === 'failed' ? 'text-red-500' : 'text-slate-500'
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
        className={`h-12 flex items-center gap-3 px-5 rounded-full shadow-xl border transition-all ${
          activeTasks.length > 0 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-600'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          {activeTasks.length > 0 ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : (
            <CheckCircle2 size={18} className="text-green-500" />
          )}
          {activeTasks.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-[8px] font-black flex items-center justify-center rounded-full border border-slate-900">
              {activeTasks.length}
            </span>
          )}
        </div>
        
        <div className="flex flex-col items-start leading-none pr-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-inherit">
            {activeTasks.length > 0 ? '任务中心' : '全部就绪'}
          </span>
          <span className="text-[7px] font-bold opacity-60 uppercase">
            {isExpanded ? 'Collapse' : 'Progress'}
          </span>
        </div>
        
        {isExpanded ? <ChevronDown size={14} className="opacity-50" /> : <ChevronUp size={14} className="opacity-50" />}
      </motion.button>
    </div>
  );
}
