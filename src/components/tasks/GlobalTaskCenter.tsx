import React from 'react';
import { useTasks, useUIStore } from '@/hooks';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';

export function GlobalTaskCenter() {
  const { tasks, removeTask, clearCompleted } = useTasks();
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;
  
  const activeTasks = tasks.filter((task: any) => task.status === 'running');
  const finishedTasks = tasks.filter((task: any) => task.status !== 'running');
  
  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[60] flex flex-col gap-3 pointer-events-none w-80">
      <AnimatePresence mode="popLayout">
        {tasks.map((task: any) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "pointer-events-auto p-3 rounded-xl border shadow-lg backdrop-blur-md flex flex-col gap-2",
              task.status === 'running' ? "bg-brand-bg/90 border-brand-primary/20" : 
              task.status === 'error' ? "bg-red-50/90 border-red-200" : 
              "bg-green-50/90 border-green-200"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {task.status === 'running' && (
                  <Loader2 className="w-4 h-4 text-brand-primary animate-spin shrink-0" />
                )}
                {task.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                )}
                {task.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="text-xs font-medium truncate text-slate-800">
                  {task.name}
                </span>
              </div>
              <button 
                onClick={() => removeTask(task.id)}
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                id={`task-remove-${task.id}`}
              >
                <X className="w-3.5 h-3.5 text-black/40" />
              </button>
            </div>

            {task.status === 'running' && (
              <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-brand-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                />
              </div>
            )}
            
            {task.message && (
              <p className="text-[10px] text-black/50 truncate">
                {task.message}
              </p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {(finishedTasks.length > 2) && (
        <button
          onClick={clearCompleted}
          className="pointer-events-auto self-start text-[10px] font-medium text-black/40 hover:text-red-500 flex items-center gap-1.5 px-3 py-1.5 bg-white/50 backdrop-blur rounded-full border border-black/5 transition-colors"
          id="clear-tasks-btn"
        >
          <Trash2 className="w-3 h-3" />
          {t.clear || 'Clear'}
        </button>
      )}
    </div>
  );
}
