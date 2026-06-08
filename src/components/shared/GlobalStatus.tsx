import React from 'react';
import { useGlobalTasks } from '@/hooks/admin/useGlobalTasks';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

export function GlobalStatus() {
  const { tasks } = useGlobalTasks();
  const update = useUIStore(s => s.update);
  
  const activeTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'processing') : [];
  const hasActive = activeTasks.length > 0;
  
  if (!hasActive) return null;

  const totalProgress = activeTasks.reduce((acc, t) => acc + t.progress, 0) / activeTasks.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.8 }}
        onClick={() => {
            update({ activeScreen: 'diagnostics' });
        }}
        className="fixed bottom-6 left-6 z-[100] cursor-pointer group"
      >
        <div className="bg-brand-navy text-white rounded-2xl p-3 pl-4 pr-5 shadow-2xl flex items-center gap-3 border border-white/10 overflow-hidden relative">
          {/* Progress Background */}
          <motion.div 
            className="absolute inset-0 bg-blue-500/20 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: totalProgress / 100 }}
            transition={{ type: 'spring', bounce: 0, duration: 1 }}
          />

          <div className="relative z-10 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center relative">
                <RefreshCw size={16} className="animate-spin text-blue-400" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
             </div>
             
             <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Task Running</div>
                <div className="text-[11px] font-black uppercase tracking-tight flex items-center gap-1.5">
                   {activeTasks[0].title}
                   {activeTasks.length > 1 && (
                     <span className="bg-white/20 px-1.5 rounded text-[9px]">+{activeTasks.length - 1}</span>
                   )}
                </div>
             </div>

             <div className="h-6 w-px bg-white/10 mx-1" />

             <div className="text-sm font-black tabular-nums text-blue-400">
                {Math.round(totalProgress)}%
             </div>
          </div>
        </div>

        {/* Hover Tooltip/Label */}
        <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
           <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-1 rounded-md uppercase tracking-widest shadow-xl">
             点击进入指挥部
           </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
