import React from 'react';
import { useTask, isTaskDrawerOpen } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';

export function TaskBadge() {
  const status = useTask(s => s.status);
  const progress = useTask(s => s.progress);

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
      <span className="text-[11px] font-bold tracking-tight uppercase select-none text-slate-200">
        上傳任務執行中 {progress}%
      </span>
    </button>
  );
}
