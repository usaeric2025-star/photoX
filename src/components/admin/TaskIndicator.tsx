import { useGlobalTasks } from '#src/hooks/admin/useGlobalTasks.js';
import { Icon } from '#src/components/ui/Icon.js';
import { usePermission } from '#src/hooks/core/auth/usePermission.js';
import { useTranslation } from '#src/hooks/index.js';

export function TaskIndicator() {
  const { t } = useTranslation();
  const { isStaff } = usePermission();
  const { tasks } = useGlobalTasks();
  
  if (!isStaff) return null;
  
  const activeTasks = tasks.filter(t => t.status === 'processing');

  if (activeTasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-white border border-slate-200 shadow-lg rounded-lg p-3 flex items-center gap-2 text-sm text-slate-700 pointer-events-none">
      <Icon name="loader" size={16} className="animate-spin text-primary" />
      <span>{t('tasksInProgress', activeTasks.length)}</span>
    </div>
  );
}
