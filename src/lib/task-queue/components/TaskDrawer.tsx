import { createPortal } from 'react-dom';
import React from 'react';
import { useTaskSelector } from '../store';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';
import { X } from 'lucide-react';

function TaskItem({ task }: { task: any }) {
  return (
    <div className="p-2 border rounded text-sm">
      <div>{task.label}</div>
      <div className="text-xs text-slate-500">
        Status: {task.state.status}
        {task.state.status === 'processing' && ` (${Math.round((task.state.progress || 0) * 100)}%)`}
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
  const isOpen = useUIStore((s) => s.isTaskDrawerOpen);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        useUIStore.getState().update({ isTaskDrawerOpen: false });
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
            useUIStore.getState().update({ isTaskDrawerOpen: false });
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
          <button 
            type="button"
            onClick={() => useUIStore.getState().update({ isTaskDrawerOpen: false })}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            aria-label="關閉"
          >
            <X size={18} />
          </button>
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
