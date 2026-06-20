import React from 'react';
import { createPortal } from 'react-dom';
import { useTasks, type BackgroundTask } from '@/hooks';
import { Loader2, CheckCircle2, XCircle, X } from '@/components/ui/Icon';
import { motion, AnimatePresence } from 'motion/react';

export function BackgroundTaskPanel() {
  const { tasks, removeTask, cancelTask, isAvoidingSelection } = useTasks();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  const activeTasks = tasks.filter(t => 
    t.status === 'running' || 
    t.status === 'error' || 
    t.status === 'cancelled' ||
    (t.status === 'completed' && t.progress === 100)
  );

  React.useEffect(() => {
    if (!mounted) return;
    if (activeTasks.length > 0 && panelRef.current) {
      if (!panelRef.current.matches(':popover-open')) {
        panelRef.current.showPopover();
      }
    } else if (activeTasks.length === 0 && panelRef.current) {
      if (panelRef.current.matches(':popover-open')) {
        panelRef.current.hidePopover();
      }
    }
  }, [activeTasks.length, mounted]);

  if (!mounted || activeTasks.length === 0) return null;

  const portalRoot = document.getElementById('portal-root') || document.body;

  const style: React.CSSProperties = {
    top: 'auto',
    right: 'auto',
    bottom: isAvoidingSelection ? '6.5rem' : '1.5rem',
    left: '1.5rem',
    margin: 0,
    inset: 'auto auto auto auto', 
    transition: 'bottom 0.3s ease-in-out'
  };

  return createPortal(
    <div 
      ref={panelRef}
      popover="manual"
      className="fixed z-[2147483647] flex flex-col gap-3 w-80 pointer-events-none bg-transparent m-0 p-0 overflow-visible border-none"
      style={{
        ...style,
        bottom: isAvoidingSelection ? '6.5rem' : '1.5rem',
      }}
    >
      <div className="pointer-events-auto bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="text-blue-500 animate-spin" />
          <span className="text-xs font-bold text-slate-700">任务管理中心</span>
        </div>
        <button 
           type="button"
           onClick={() => setIsExpanded(!isExpanded)}
           className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800"
        >
          {isExpanded ? '收起' : '展开'} ({activeTasks.length})
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {isExpanded && activeTasks.slice(-3).map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onRemove={() => removeTask(task.id)}
            onCancel={() => cancelTask(task.id)}
          />
        ))}
      </AnimatePresence>
    </div>,
    portalRoot
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
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="关闭 / Close"
          >
            <X size={14} />
          </button>
        ) : (
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
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
