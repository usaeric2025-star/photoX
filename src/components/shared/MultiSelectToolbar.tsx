import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Trash2, Brain, Edit3, EyeOff, Layers, 
  Sparkles, Pencil, Check
} from 'lucide-react';
import { useMultiSelect, useGalleryStore, useShallow } from '@/hooks';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { cn } from '@/lib/utils';

interface MultiSelectToolbarProps {
  variant?: 'admin' | 'group';
  onGroupAction?: (action: 'ai' | 'remove' | 'batch') => void;
}

export function MultiSelectToolbar({ variant = 'admin', onGroupAction }: MultiSelectToolbarProps) {
  const { selectedIds, disable } = useMultiSelect();
  const { deletePhoto, batchUpdate } = useAdminActions();
  const { setBatchEditingIds } = useGalleryStore(useShallow(s => ({
    setBatchEditingIds: s.setBatchEditingIds
  })));

  const isVisible = selectedIds.length > 0;

  const handleBatchDelete = async () => {
    if (window.confirm(`确认删除选中的 ${selectedIds.length} 张照片吗？`)) {
      await deletePhoto(selectedIds);
      disable();
    }
  };

  const handleBatchHide = async () => {
    await batchUpdate.mutateAsync({ ids: selectedIds, updates: { is_hidden: true } });
    disable();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 100, opacity: 0, x: '-50%' }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-4 bg-slate-900/95 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl shadow-2xl min-w-[300px] text-white"
        >
          <div className="flex items-center gap-2 pr-4 border-r border-white/10 shrink-0">
            <button 
              onClick={disable}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-black leading-none">{selectedIds.length}</span>
              <span className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">Selected</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {variant === 'admin' ? (
              <>
                <button 
                  onClick={() => setBatchEditingIds(selectedIds)}
                  className="flex flex-col items-center gap-1 min-w-[48px] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-all">
                    <Edit3 size={16} />
                  </div>
                  <span className="text-[9px] font-bold opacity-60">编辑</span>
                </button>

                <button 
                  onClick={handleBatchHide}
                  className="flex flex-col items-center gap-1 min-w-[48px] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-slate-700 transition-all">
                    <EyeOff size={16} />
                  </div>
                  <span className="text-[9px] font-bold opacity-60">隐藏</span>
                </button>

                <div className="w-px h-8 bg-white/10 mx-1" />

                <button 
                  onClick={handleBatchDelete}
                  className="flex flex-col items-center gap-1 min-w-[48px] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/10 text-red-400 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                    <Trash2 size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-red-400/60">删除</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => onGroupAction?.('ai')}
                  className="flex flex-col items-center gap-1 min-w-[48px] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-purple-400/60">AI 識別</span>
                </button>
                
                <button 
                  onClick={() => onGroupAction?.('batch')}
                  className="flex flex-col items-center gap-1 min-w-[48px] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-all">
                    <Pencil size={16} />
                  </div>
                  <span className="text-[9px] font-bold opacity-60">批量编辑</span>
                </button>

                <button 
                  onClick={() => onGroupAction?.('remove')}
                  className="flex flex-col items-center gap-1 min-w-[48px] group"
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <Layers size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-orange-400/60">移出組</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
