import React from 'react';
import { Sparkles, Trash2, Layers, X, Edit3, EyeOff } from 'lucide-react';
import { useBatchConfirmDialog as useBatchConfirmation } from '@/hooks';

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
  const { openDialog: confirmDelete } = useBatchConfirmation({
    actionType: 'delete',
    selectedCount,
    onConfirm: onDelete
  });

  const { openDialog: confirmToggleVisibility } = useBatchConfirmation({
    actionType: 'show', // Simplification, assuming toggle
    selectedCount,
    onConfirm: onToggleVisibility || (() => {})
  });

  return (
    <div className="p-2 rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 max-w-[calc(100vw-2rem)] w-auto flex-nowrap flex items-center gap-1">
      <button 
        onClick={onClose} 
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all flex-shrink-0" 
        title="退出多选 (Cancel & Exit)"
      >
        <X size={18} />
      </button>
      
      <div className="px-2 font-bold text-blue-600 text-[13px] flex items-center min-w-[2rem] justify-center bg-blue-50/50 py-1 rounded-xl flex-shrink-0">
        {selectedCount}
      </div>

      <div className="h-5 w-px bg-slate-200 mx-1 flex-shrink-0" />

      <button onClick={onBatchAiIdentify} className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl flex-shrink-0" title="AI Identify"><Sparkles size={18} /></button>
      <button onClick={onBatchEdit} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl flex-shrink-0" title="Edit"><Edit3 size={18} /></button>
      <button onClick={onGroup} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl flex-shrink-0" title="Group"><Layers size={18} /></button>
      <button onClick={confirmToggleVisibility} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-xl flex-shrink-0" title="Toggle Visibility"><EyeOff size={18} /></button>
      <button onClick={confirmDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-xl flex-shrink-0" title="Delete"><Trash2 size={18} /></button>
    </div>
  );
};

