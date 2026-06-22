import { createPortal } from 'react-dom';
import React from 'react';
import { useTaskSelector } from '../store';
import { useUI, storeAccessor } from '@/lib/store';

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

  if (!mounted || count === 0) return null;

  const container = document.getElementById('portal-root');
  if (!container) return null;

  return createPortal(
    <button 
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        storeAccessor.ui.update({ isTaskDrawerOpen: !storeAccessor.ui.isTaskDrawerOpen });
      }}
      className="fixed bottom-4 right-4 bg-primary text-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center font-bold"
    >
      {count}
    </button>,
    container
  );
}
