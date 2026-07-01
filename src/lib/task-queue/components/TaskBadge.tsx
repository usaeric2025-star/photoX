import React from 'react';
import { isTaskDrawerOpen, useSignal } from '#lib/store';
import { globalTaskStatusSignal, globalTaskProgressSignal } from '#src/services/task/taskService';
import { Icon } from '#src/components/ui/Icon';
import { Progress } from '#src/components/shared/Progress';

export function TaskBadge() {
  const status = useSignal(globalTaskStatusSignal);
  const progress = useSignal(globalTaskProgressSignal);

  if (status !== 'processing') return null;

  return (
    <button 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        isTaskDrawerOpen.set(!isTaskDrawerOpen.get());
      }}
      className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white shadow-2xl rounded-full h-12 px-4 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 group font-sans z-[9990]"
      aria-label="開啟任務佇列"
    >
      <div className="relative flex items-center justify-center">
        <Icon name="refresh-cw" size={16} className="text-blue-400 animate-spin" />
      </div>
      <div className="flex flex-col gap-0.5 w-24">
        <span className="text-[10px] font-bold tracking-tight uppercase select-none text-slate-200">
          上傳中
        </span>
        <Progress value={progress * 100} className="h-1 bg-slate-700" indicatorClassName="bg-blue-400" />
      </div>
    </button>
  );
}
