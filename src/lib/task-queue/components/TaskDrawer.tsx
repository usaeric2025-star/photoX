import { createPortal } from 'react-dom';
import React from 'react';
import { useTaskSelector } from '../store';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

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
  
  if (!mounted) return null;

  const container = document.getElementById('portal-root');
  if (!container) return null;

  return createPortal(
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-80 bg-card border-l shadow-lg transition-all duration-300',
        !isOpen ? 'translate-x-full pointer-events-none' : 'translate-x-0'
      )}
    >
      <div className="p-4 border-b font-semibold">任務佇列</div>
      <div className="p-2 space-y-2">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>,
    container
  );
}
