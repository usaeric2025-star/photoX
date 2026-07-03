import { useGlobalTasks } from '#src/hooks/admin/useGlobalTasks.js';
import { Icon } from '#src/components/ui/Icon.js';

export function TaskIndicator() {
  const { tasks } = useGlobalTasks();
  const activeTasks = tasks.filter(t => t.status === 'processing');

  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-white border border-slate-200 shadow-lg rounded-lg p-3 flex items-center gap-2 text-sm text-slate-700 pointer-events-none">
      <Icon name="loader" size={16} className="animate-spin text-primary" />
      <span>{activeTasks.length} 个任务进行中...</span>
    </div>
  );
}
