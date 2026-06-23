import React from 'react';
import { useTaskSelector } from '@/store/taskStore';
import { useUI, storeAccessor } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';

export function TaskBadge() {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const count = useTaskSelector((state) => 
    Array.from(state.tasks.values()).filter(t => 
      t.state.status === 'queued' || t.state.status === 'processing'
    ).length
  );

  const isOpen = useUI((s) => s.isTaskDrawerOpen);

  if (!mounted || count === 0) return null;

  return (
    <button 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        storeAccessor.ui.patch({ isTaskDrawerOpen: !isOpen });
      }}
      className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white shadow-2xl rounded-full h-12 px-4 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 group font-sans z-[9990]"
      aria-label="開啟任務佇列"
    >
      <div className="relative flex items-center justify-center">
        <Icon name="refresh-cw" size={16} className="text-blue-400 animate-spin" />
      </div>
      <span className="text-[11px] font-bold tracking-tight uppercase select-none text-slate-200">
        上傳任務執行中
      </span>
      <div className="bg-blue-500 text-white rounded-full text-[10px] font-black h-5 min-w-5 px-1.5 flex items-center justify-center shadow-md">
        {count}
      </div>
    </button>
  );
}
