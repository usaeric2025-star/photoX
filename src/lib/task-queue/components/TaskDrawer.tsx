import { createPortal } from 'react-dom';
import React from 'react';
import { useTask, useTaskSelector, useUI, storeAccessor } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

function TaskItem({ task }: { task: any }) {
  const statusColors = {
    queued: 'text-slate-500',
    processing: 'text-blue-500',
    completed: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-yellow-500'
  };

  const statusLabels = {
    queued: '等待中',
    processing: '處理中',
    completed: '已完成',
    failed: '失敗',
    cancelled: '已取消'
  };

  return (
    <div className="p-2 border rounded text-sm relative">
      <div>{task.label}</div>
      <div className={cn("text-xs mt-1", statusColors[task.state.status as keyof typeof statusColors])}>
        狀態: {statusLabels[task.state.status as keyof typeof statusLabels] || task.state.status}
        {task.state.status === 'processing' && task.state.message && ` - ${task.state.message}`}
        {task.state.status === 'processing' && task.state.progress !== undefined && ` (${Math.round(task.state.progress * 100)}%)`}
      </div>
    </div>
  );
}

export function TaskDrawer() {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const tasksMap = useTaskSelector((state) => state.tasks);
  const tasks = React.useMemo(() => Array.from(tasksMap.values()), [tasksMap]);
  const isOpen = useUI((s) => s.isTaskDrawerOpen);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        storeAccessor.ui.update({ isTaskDrawerOpen: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen]);
  
  if (!mounted) return null;

  const container = document.getElementById('portal-root');
  if (!container) return null;

  return createPortal(
    <>
      {/* Backdrop overlay to prevent underlying elements (like NativeDialog backdrops) from receiving outside clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-[1px]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            storeAccessor.ui.update({ isTaskDrawerOpen: false });
          }}
        />
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-card border-l shadow-lg transition-all duration-300',
          !isOpen ? 'translate-x-full pointer-events-none' : 'translate-x-0'
        )}
      >
        <div className="p-4 border-b font-semibold flex items-center justify-between">
          <span>任務佇列</span>
          <div className="flex items-center gap-2">
            {tasks.some(t => t.state.status === 'completed' || t.state.status === 'failed') && (
              <button 
                type="button"
                onClick={() => {
                  const state = storeAccessor.task;
                  const remaining = Array.from(state.tasks.values()).filter((t: any) => t.state?.status === 'pending' || t.state?.status === 'processing');
                  state.clearAll();
                  remaining.forEach(t => state.enqueue(t));
                }}
                className="text-xs text-blue-500 hover:text-blue-600 font-normal px-2 py-1"
              >
                清除歷史
              </button>
            )}
            <button 
              type="button"
              onClick={() => storeAccessor.ui.update({ isTaskDrawerOpen: false })}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              aria-label="關閉"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>
        <div className="p-2 space-y-2">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </div>
    </>,
    container
  );
}
