import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles, Pencil, Layers, X } from 'lucide-react';
import { Photo } from '../../types';

interface GroupMultiSelectBarProps {
  isMultiSelectMode: boolean;
  selectedPhotoIds: string[];
  activeGroupPhotos: Photo[];
  handleBulkAction: (action: 'ai' | 'remove' | 'batch') => void;
  setSelectedPhotoIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setIsMultiSelectMode: (mode: boolean) => void;
}

export const GroupMultiSelectBar: React.FC<GroupMultiSelectBarProps> = ({
  isMultiSelectMode,
  selectedPhotoIds,
  activeGroupPhotos,
  handleBulkAction,
  setSelectedPhotoIds,
  setIsMultiSelectMode
}) => {
  return (
    <AnimatePresence>
      {isMultiSelectMode && selectedPhotoIds.length > 0 && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-brand-navy px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 min-w-[320px]"
        >
           <div className="bg-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
             <Check size={14} className="text-white" />
             <span className="text-sm font-black text-white">{selectedPhotoIds.length}</span>
           </div>
           
           <div className="flex items-center gap-3 flex-1 overflow-x-auto no-scrollbar scroll-smooth">
              <button onClick={() => handleBulkAction('ai')} className="flex flex-col items-center gap-1 shrink-0" title="AI 分析">
                 <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20 active:scale-95 transition-all">
                    <Sparkles size={18} />
                 </div>
                 <span className="text-[10px] font-bold text-white/60">AI 識別</span>
              </button>
              
              <button onClick={() => handleBulkAction('batch')} className="flex flex-col items-center gap-1 shrink-0">
                 <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all">
                    <Pencil size={18} />
                 </div>
                 <span className="text-[10px] font-bold text-white/60">批量编辑</span>
              </button>

              <button onClick={() => handleBulkAction('remove')} className="flex flex-col items-center gap-1 shrink-0">
                 <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/20 active:scale-95 transition-all">
                    <Layers size={18} />
                 </div>
                 <span className="text-[10px] font-bold text-white/60">移出組</span>
              </button>

              <button 
                onClick={() => {
                  const allIds = activeGroupPhotos.map(p => p.id);
                  setSelectedPhotoIds(selectedPhotoIds.length === allIds.length ? [] : allIds);
                }} 
                className="flex flex-col items-center gap-1 shrink-0 px-2"
              >
                 <div className="w-10 h-10 rounded-xl bg-white/5 text-white/80 flex items-center justify-center border border-white/5 active:scale-95 transition-all">
                    {selectedPhotoIds.length === activeGroupPhotos.length ? <X size={18} /> : <Check size={18} />}
                 </div>
                 <span className="text-[10px] font-bold text-white/60">{selectedPhotoIds.length === activeGroupPhotos.length ? '取消' : '全選'}</span>
              </button>
           </div>

           <div className="w-px h-8 bg-white/10" />
           <button onClick={() => { setIsMultiSelectMode(false); setSelectedPhotoIds([]); }} className="p-2 text-white/40 hover:text-white">
              <X size={20} />
           </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
