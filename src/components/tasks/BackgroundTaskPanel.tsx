import React from 'react';
import { createPortal } from 'react-dom';
import { useTasks, type BackgroundTask } from '@/hooks';
import { Icon } from '@/components/ui/Icon';
import { logger } from '@/lib/logger';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
import { LoadingProgress } from '@/components/ui/feedback/LoadingProgress';

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
      try {
        if (typeof panelRef.current.showPopover === 'function' && !panelRef.current.matches(':popover-open')) {
          panelRef.current.showPopover();
        }
      } catch (e) {
        logger.warn('Popover API not supported or failed:', e);
      }
    } else if (activeTasks.length === 0 && panelRef.current) {
      try {
        if (typeof panelRef.current.hidePopover === 'function' && panelRef.current.matches(':popover-open')) {
          panelRef.current.hidePopover();
        }
      } catch (e) {
        // ignore
      }
    }
  }, [activeTasks.length, mounted]);

  if (!mounted || activeTasks.length === 0) return null;

  const portalRoot = document.getElementById('portal-root') || document.body;

  const style: React.CSSProperties = {
    margin: 0,
    top: 'auto',
    right: 'auto',
    bottom: isAvoidingSelection ? '6.5rem' : '1.5rem',
    left: '1.5rem',
    transition: 'bottom 0.3s ease-in-out'
  };

  return createPortal(
      <div 
        ref={panelRef}
        popover="manual"
        className="fixed z-[2147483647] flex flex-col gap-2 w-64 pointer-events-none bg-transparent m-0 p-0 overflow-visible border-none"
        style={style}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-between px-3 py-2"
        >
          <div className="flex items-center gap-1.5">
            <LoadingSpinner size="xs" />
            <span className="text-[11px] font-bold text-slate-700">任务中心</span>
          </div>
          <button 
             type="button"
             onClick={() => setIsExpanded(!isExpanded)}
             className="text-[10px] bg-slate-50 px-2 py-0.5 rounded-lg text-slate-500 hover:text-slate-800"
          >
            {isExpanded ? '收起' : '展开'} ({activeTasks.length})
          </button>
        </div>

        {isExpanded && activeTasks.slice(-3).map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onRemove={() => removeTask(task.id)}
            onCancel={() => cancelTask(task.id)}
          />
        ))}
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
    <div
      onClick={(e) => e.stopPropagation()}
      className={`pointer-events-auto bg-white rounded-2xl shadow-lg border p-3 flex flex-col gap-2 overflow-hidden transition-all duration-300 ${
        isError ? 'border-red-100' : isCompleted ? 'border-green-50 animate-pulse' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            isError ? 'bg-red-50 text-red-500' : 
            isCompleted ? 'bg-green-50 text-green-500' : 
            'bg-blue-50 text-blue-500'
          }`}>
            {isRunning && <LoadingSpinner size="xs" />}
            {isCompleted && <Icon name="check-circle-2" size={14} />}
            {isError && <Icon name="x-circle" size={14} />}
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] font-bold uppercase tracking-tight text-slate-800 truncate">
              {task.name}
            </h4>
            <p className="text-[9px] text-slate-500 truncate leading-tight mt-0.5">
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
            <Icon name="x" size={14} />
          </button>
        ) : (
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
            title="取消 / Cancel"
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      {isRunning && (
        <div className="pt-2">
          <LoadingProgress value={task.progress} showPercentage />
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
    </div>
  );
}
