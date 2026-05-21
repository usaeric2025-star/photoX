import React from 'react';
import { Sparkles, Trash2, Layers, X, Edit3, EyeOff, CheckSquare, Square } from 'lucide-react';
import { FloatingActionBar } from '../ui/FloatingActionBar';

interface Props {
  selectedCount: number;
  onClose: () => void;
  onBatchAiIdentify: () => void;
  onBatchEdit: () => void;
  onGroup: () => void;
  onDelete: () => void;
  onToggleVisibility?: () => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
}

export const MultiSelectToolbar: React.FC<Props> = ({
  selectedCount, onClose,
  onBatchAiIdentify, onBatchEdit, onGroup, onDelete, onToggleVisibility
}) => {
  return (
    <FloatingActionBar position="bottom-right" className="!bottom-6 !left-1/2 !-translate-x-1/2 !z-[200] !p-2.5 !rounded-2xl !bg-white !shadow-2xl !border-slate-100 max-w-[calc(100vw-2rem)] w-auto flex-wrap justify-center sm:flex-nowrap flex items-center gap-1.5">
      <button 
        onClick={onClose} 
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all" 
        title="退出多选 (Cancel & Exit)"
      >
        <X size={18} />
      </button>
      
      <div className="px-2 font-bold text-blue-600 text-[13px] flex items-center min-w-[2.5rem] justify-center bg-blue-50/50 py-1 rounded-xl">
        {selectedCount}
      </div>

      <div className="h-5 w-px bg-slate-200 mx-1 flex-shrink-0" />

      <button 
        onClick={onClose}
        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all text-[11px] flex-shrink-0"
        title="清空并退出"
      >
        清空
      </button>

      <div className="h-5 w-px bg-slate-200 mx-1 flex-shrink-0" />

      <button onClick={onBatchAiIdentify} className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl flex-shrink-0" title="AI Identify"><Sparkles size={18} /></button>
      <button onClick={onBatchEdit} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl flex-shrink-0" title="Edit"><Edit3 size={18} /></button>
      <button onClick={onGroup} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl flex-shrink-0" title="Group"><Layers size={18} /></button>
      <button onClick={onToggleVisibility} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-xl flex-shrink-0" title="Toggle Visibility"><EyeOff size={18} /></button>
      <button onClick={onDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-xl flex-shrink-0" title="Delete"><Trash2 size={18} /></button>
    </FloatingActionBar>
  );
};
