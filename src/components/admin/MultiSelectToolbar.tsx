import React from 'react';
import { Sparkles, Trash2, Layers, X, Edit3 } from 'lucide-react';

interface Props {
  selectedCount: number;
  onClose: () => void;
  onBatchAiIdentify: () => void;
  onBatchEdit: () => void;
  onGroup: () => void;
  onDelete: () => void;
}

export const MultiSelectToolbar: React.FC<Props> = ({
  selectedCount, onClose,
  onBatchAiIdentify, onBatchEdit, onGroup, onDelete
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-brand-navy px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4">
       <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-xl"><X size={20} /></button>
       <div className="bg-white/10 px-2 py-1 rounded-lg font-bold text-white text-sm">{selectedCount}</div>
       <div className="h-6 w-px bg-white/10 mx-1" />
       
       <div className="flex items-center gap-3">
         <button onClick={onBatchAiIdentify} className="flex flex-col items-center gap-1" title="AI Identify">
           <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20 active:scale-95 transition-all"><Sparkles size={18} /></div>
         </button>
         <button onClick={onBatchEdit} className="flex flex-col items-center gap-1" title="Edit">
           <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"><Edit3 size={18} /></div>
         </button>
         <button onClick={onGroup} className="flex flex-col items-center gap-1" title="Group">
           <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/20 active:scale-95 transition-all"><Layers size={18} /></div>
         </button>
         <button onClick={onDelete} className="flex flex-col items-center gap-1" title="Delete">
           <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/20 active:scale-95 transition-all"><Trash2 size={18} /></div>
         </button>
       </div>
    </div>
  );
};
