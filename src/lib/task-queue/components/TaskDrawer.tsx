import React from 'react';
import { useSignal, storeAccessor, isTaskDrawerOpen } from '#lib/store';
import { tasksSignal, clearAll, addTask } from '#src/services/task/taskService';
import { cn } from '#lib/utils';
import { Icon } from '#src/components/ui/Icon';
import { Progress } from '#src/components/shared/Progress';
import { Task } from '#lib/task-queue/types';

function TaskItem({ task }: { task: Task }) {
  const statusBg = {
    queued: 'bg-slate-50 border-slate-100',
    processing: 'bg-blue-50/10 border-blue-100/50',
    completed: 'bg-green-50/10 border-green-100/50',
    failed: 'bg-red-50/10 border-red-100/50',
    cancelled: 'bg-amber-50/10 border-amber-100/50'
  } as const;

  const statusLabels = {
    queued: '等待中',
    processing: '處理中',
    completed: '已完成',
    failed: '失敗',
    cancelled: '已取消'
  } as const;

  const typeIcons: Record<string, string> = {
    'upload': 'upload-cloud',
    'ai-analyze': 'sparkles',
    'repair': 'wrench',
    'sync': 'refresh-cw'
  };

  const progress = task.state.status === 'processing' ? task.state.progress : (task.state.status === 'completed' ? 1 : 0);
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  const message = task.state.status === 'processing' ? task.state.message : (task.state.status === 'failed' ? task.state.error : undefined);

  return (
    <div className={cn(
      "p-4 border rounded-2xl relative space-y-3 transition-all duration-300", 
      statusBg[task.state.status as keyof typeof statusBg] || 'border-slate-100 bg-slate-50',
      task.state.status === 'processing' ? 'shadow-md shadow-blue-500/5' : 'shadow-sm'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0",
            task.state.status === 'processing' ? 'bg-blue-100 text-blue-600 animate-pulse' : 
            task.state.status === 'completed' ? 'bg-green-100 text-green-600' :
            task.state.status === 'failed' ? 'bg-red-100 text-red-600' :
            'bg-slate-100 text-slate-500'
          )}>
            <Icon name={typeIcons[task.type] || 'activity'} size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 text-xs truncate uppercase tracking-tight">{task.label}</div>
            {message && (
              <p className={cn(
                "text-[10px] mt-0.5 line-clamp-2 leading-normal font-medium",
                task.state.status === 'failed' ? 'text-red-500' : 'text-slate-500'
              )}>
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <span className={cn(
            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full select-none", 
            task.state.status === 'completed' ? 'bg-green-100 text-green-700' :
            task.state.status === 'failed' ? 'bg-red-100 text-red-700' :
            task.state.status === 'processing' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          )}>
            {statusLabels[task.state.status as keyof typeof statusLabels] || task.state.status}
          </span>
        </div>
      </div>

      {(task.state.status === 'processing' || task.state.status === 'queued') && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
            <span>PROGRESS</span>
            <span className="tabular-nums text-slate-600">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

export function TaskDrawer() {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const tasksMap = useSignal(tasksSignal);
  const tasks = React.useMemo(() => Array.from(tasksMap.values() as IterableIterator<Task>), [tasksMap]);
  const isOpen = useSignal(isTaskDrawerOpen);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        isTaskDrawerOpen.set(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen]);
  
  if (!mounted) return null;

  return (
    <>
      {/* Backdrop overlay to prevent underlying elements from receiving outside clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9995]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            isTaskDrawerOpen.set(false);
          }}
        />
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'fixed right-0 top-0 h-full w-85 bg-white border-l border-slate-100 shadow-2xl transition-all duration-300 flex flex-col z-[9996]',
          !isOpen ? 'translate-x-full pointer-events-none' : 'translate-x-0'
        )}
      >
        <div className="p-4 border-b border-slate-100 h-16 flex items-center justify-between shrink-0">
          <span className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">任務佇列 (Queue)</span>
          <div className="flex items-center gap-1.5">
            {tasks.some(t => t.state.status === 'completed' || t.state.status === 'failed') && (
              <button 
                type="button"
                onClick={() => {
                  const remaining = (Array.from(tasksMap.values()) as Task[]).filter(t => t.state?.status === 'queued' || t.state?.status === 'processing');
                  clearAll();
                  remaining.forEach(t => addTask(t));
                }}
                className="text-xs text-blue-500 hover:text-blue-600 font-bold px-2 py-1 select-none active:scale-95 transition-all"
              >
                清除歷史
              </button>
            )}
            <button 
              type="button"
              onClick={() => isTaskDrawerOpen.set(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
              aria-label="關閉"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar h-[calc(100vh-64px)] pb-24">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 animate-pulse">
                <Icon name="inbox" size={32} />
              </div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">暫無佇列任務</h4>
              <p className="text-[10px] text-slate-400 max-w-[200px] leading-normal font-medium">
                上傳照片或執行系統維護時，將在此處顯示詳細的任務狀態與即時進度。
              </p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskItem key={task.id} task={task} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
