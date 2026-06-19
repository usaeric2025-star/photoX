import React from 'react';
import { useTasks, type BackgroundTask } from '@/hooks';
import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function BackgroundTaskPanel() {
  const { tasks, removeTask, cancelTask } = useTasks();
  
  const activeTasks = tasks.filter(t => 
    t.status === 'running' || 
    t.status === 'error' || 
    t.status === 'cancelled' ||
    (t.status === 'completed' && t.progress === 100)
  );

  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[var(--z-loading)] flex flex-col gap-3 w-80 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeTasks.slice(-3).map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onRemove={() => removeTask(task.id)}
            onCancel={() => cancelTask(task.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function TaskItem({ task, onRemove, onCancel }: { task: BackgroundTask; onRemove: () => void; onCancel: () => void }) {
  const isError = task.status === 'error';
  const isCompleted = task.status === 'completed';
  const isRunning = task.status === 'running';
  const isCancelled = task.status === 'cancelled';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`pointer-events-auto bg-white rounded-2xl shadow-2xl border p-4 flex flex-col gap-3 overflow-hidden ${
        isError ? 'border-red-100' : isCompleted ? 'border-green-100' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl shrink-0 ${
            isError ? 'bg-red-50 text-red-500' : 
            isCompleted ? 'bg-green-50 text-green-500' : 
            'bg-blue-50 text-blue-500'
          }`}>
            {isRunning && <Loader2 size={16} className="animate-spin" />}
            {isCompleted && <CheckCircle2 size={16} />}
            {isError && <XCircle size={16} />}
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-800 truncate">
              {task.name}
            </h4>
            <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
              {task.message}
            </p>
          </div>
        </div>
        {(isCompleted || isError || isCancelled) ? (
          <button 
            onClick={onRemove}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="关闭 / Close"
          >
            <X size={14} />
          </button>
        ) : (
          <button 
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
            title="取消 / Cancel"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isRunning && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500" 
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
            <span>PROGRESS</span>
            <span>{task.progress}%</span>
          </div>
        </div>
      )}

      {isError && (
        <button 
          onClick={onRemove}
          className="w-full py-2 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl hover:bg-red-100 transition-colors"
        >
          关闭
        </button>
      )}
    </motion.div>
  );
}
