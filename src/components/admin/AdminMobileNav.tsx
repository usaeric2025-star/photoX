import React from 'react';
import { LayoutGrid, Plus, LayoutList, CheckSquare, Search, RefreshCw, BarChart2 } from 'lucide-react';
import { useUIStore, useUrlFilters, useTaskExecutor, useTasks } from '@/hooks';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export function AdminMobileNav() {
  const { filters, setView, setPhotoId } = useUrlFilters();
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const update = useUIStore(s => s.update);
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  
  const isSyncing = tasks.some(t => t.name.includes('同步') && t.status === 'running');
  
  const activeView = filters.view || 'grid';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] sm:hidden">
      {/* Dynamic Background Blur */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200" />
      
      <div className="relative flex items-center justify-around h-16 safe-bottom">
        <NavButton 
          icon={LayoutGrid} 
          label="网格" 
          active={activeView === 'grid'} 
          onClick={() => setView('grid')}
        />
        
        <NavButton 
          icon={LayoutList} 
          label="列表" 
          active={activeView === 'list'} 
          onClick={() => setView('list')}
        />

        {/* Center Upload Trigger */}
        <div className="relative -top-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => document.getElementById('admin-quick-add-input')?.click()}
            className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20"
          >
            <Plus size={28} />
          </motion.button>
        </div>

        <NavButton 
          icon={CheckSquare} 
          label="多选" 
          active={isMultiSelect} 
          onClick={() => update({ isMultiSelect: !isMultiSelect })}
        />
        
        <NavButton 
          icon={RefreshCw} 
          label="同步" 
          active={isSyncing} 
          onClick={() => {}} // Usually handled by sidebar refresh button, but can trigger here
          isLoading={isSyncing}
        />
      </div>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick, isLoading }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all",
        active ? "text-slate-900" : "text-slate-400"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-xl transition-colors",
        active ? "bg-slate-100" : "bg-transparent",
        isLoading && "animate-spin"
      )}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="w-1 h-1 bg-slate-900 rounded-full"
        />
      )}
    </button>
  );
}
